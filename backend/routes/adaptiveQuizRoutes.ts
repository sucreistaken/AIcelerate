import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  startSession, getSession, getSessionPool, getNextQuestion,
  submitAnswer, endSession,
} from "../services/adaptiveQuizService";
import { evaluateQuizAnswer } from "../services/lessonAiService";
import { notFound, badRequest } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { rateLimiter } from "../middleware/rateLimiter";
import { adaptiveQuizStartSchema, adaptiveQuizAnswerSchema, emptyBodySchema } from "../validators/routeSchemas";

const router = Router();

// Start a new adaptive quiz session
router.post("/adaptive-quiz/start", requireAuth, validate(adaptiveQuizStartSchema), asyncHandler(async (req, res) => {
  const { courseId, lessonIds } = req.body;

  const state = startSession(courseId, lessonIds);
  const nextQuestion = getNextQuestion(state.sessionId);

  res.json({
    ok: true,
    sessionId: state.sessionId,
    currentTheta: state.currentTheta,
    poolSize: state.remainingPool.length,
    nextQuestion: nextQuestion ? { id: nextQuestion.id, question: nextQuestion.question, topicName: nextQuestion.topicName } : null,
  });
}));

// Get current session state + next question
router.get("/adaptive-quiz/:sessionId", requireAuth, asyncHandler(async (req, res) => {
  const state = getSession(req.params.sessionId);
  if (!state) throw notFound("Session not found");

  const nextQuestion = state.isComplete ? null : getNextQuestion(state.sessionId);

  res.json({
    ok: true,
    sessionId: state.sessionId,
    currentTheta: state.currentTheta,
    questionsAsked: state.questionsAsked.length,
    isComplete: state.isComplete,
    stoppingReason: state.stoppingReason,
    nextQuestion: nextQuestion ? { id: nextQuestion.id, question: nextQuestion.question, topicName: nextQuestion.topicName } : null,
  });
}));

// Submit an answer to the current question
router.post("/adaptive-quiz/:sessionId/answer", requireAuth, validate(adaptiveQuizAnswerSchema), rateLimiter("ai:adaptive-answer", 20, 60_000), asyncHandler(async (req, res) => {
  const { itemId, answer } = req.body;

  const state = getSession(req.params.sessionId);
  if (!state) throw notFound("Session not found");
  if (state.isComplete) throw badRequest("Session is already complete");

  const pool = getSessionPool(req.params.sessionId);
  const item = pool.find(q => q.id === itemId);
  if (!item) throw notFound("Question not found in pool");

  // Evaluate answer using existing AI evaluator
  let grade: "correct" | "partial" | "incorrect" = "incorrect";
  try {
    const evalResult = await evaluateQuizAnswer(item.question, answer, "", "", item.lessonId);
    grade = evalResult.grade || "incorrect";
  } catch {
    // If AI eval fails, fall back to simple check
    if (item.expectedAnswer && answer.toLowerCase().includes(item.expectedAnswer.toLowerCase())) {
      grade = "correct";
    }
  }

  const updatedState = submitAnswer(req.params.sessionId, itemId, grade);
  if (!updatedState) throw notFound("Session not found");

  const nextQuestion = updatedState.isComplete ? null : getNextQuestion(req.params.sessionId);

  res.json({
    ok: true,
    grade,
    currentTheta: updatedState.currentTheta,
    questionsAsked: updatedState.questionsAsked.length,
    isComplete: updatedState.isComplete,
    stoppingReason: updatedState.stoppingReason,
    nextQuestion: nextQuestion ? { id: nextQuestion.id, question: nextQuestion.question, topicName: nextQuestion.topicName } : null,
  });
}));

// Force end a session
router.post("/adaptive-quiz/:sessionId/end", requireAuth, validate(emptyBodySchema), asyncHandler(async (req, res) => {
  const summary = endSession(req.params.sessionId);
  if (!summary) throw notFound("Session not found");
  res.json({ ok: true, summary });
}));

export default router;
