import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { rateLimiter } from "../middleware/rateLimiter";
import {
  generateQuizFromPlan, generateQuizAnswers,
  evaluateQuizAnswer, evaluateQuizBatch,
} from "../services/lessonAiService";
import {
  quizFromPlanSchema, quizAnswersSchema, quizEvalSchema, quizEvalBatchSchema,
} from "../validators/quizSchemas";

const router = Router();

// ---- Quiz ----
router.post("/quiz-from-plan", requireAuth, validate(quizFromPlanSchema), asyncHandler(async (req, res) => {
  const questions = await generateQuizFromPlan(req.body.plan, req.body.lessonId);
  res.json({ ok: true, questions });
}));

router.post("/quiz-answers", requireAuth, validate(quizAnswersSchema), asyncHandler(async (req, res) => {
  const { questions, lectureText, slidesText, plan, lessonId } = req.body;
  const answers = await generateQuizAnswers(questions, lectureText, slidesText, plan, lessonId);
  res.json({ ok: true, answers });
}));

router.post("/quiz-eval", requireAuth, rateLimiter("ai:quiz-eval", 10, 60_000), validate(quizEvalSchema), asyncHandler(async (req, res) => {
  const { q, student_answer, lectureText, slidesText, lessonId } = req.body;
  const evalResult = await evaluateQuizAnswer(q, student_answer, lectureText, slidesText, lessonId);
  res.json({ ok: true, ...evalResult });
}));

router.post("/quiz-eval-batch", requireAuth, rateLimiter("ai:quiz-eval", 10, 60_000), validate(quizEvalBatchSchema), asyncHandler(async (req, res) => {
  const { items, lectureText, slidesText, lessonId } = req.body;
  const results = await evaluateQuizBatch(items, lectureText, slidesText, lessonId);
  res.json({ ok: true, results });
}));

export default router;
