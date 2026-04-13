// services/adaptiveQuizService.ts
// IRT-lite adaptive quiz engine.
// Selects questions based on estimated student ability (theta).

import type {
  AdaptiveQuizItem,
  AdaptiveQuizState,
  AdaptiveQuizConfig,
  AdaptiveQuizSummary,
} from "../types/adaptiveQuiz";
import { uid } from "../utils/idGenerator";
import { getLesson } from "./lessonDataService";
import { getCourse } from "./courseDataService";
import { logger } from "../utils/logger";

const DEFAULT_CONFIG: AdaptiveQuizConfig = {
  maxQuestions: 10,
  convergenceThreshold: 0.3,
  convergenceWindow: 3,
};

/** Internal session state that extends AdaptiveQuizState with the question pool */
interface InternalSession extends AdaptiveQuizState {
  _pool: AdaptiveQuizItem[];
}

// In-memory session store
const sessions = new Map<string, InternalSession>();

// TTL cleanup: remove sessions older than 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;
const _sessionCleanup = setInterval(() => {
  const now = Date.now();
  for (const [id, state] of sessions) {
    if (now - new Date(state.createdAt).getTime() > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);
_sessionCleanup.unref();

// ── IRT Math ────────────────────────────────────────────────────────────────

/** Rasch model: probability of correct response given theta and difficulty */
export function irtProbability(theta: number, difficulty: number): number {
  return 1 / (1 + Math.exp(-(theta - difficulty)));
}

/** Update theta after a response */
export function updateTheta(
  currentTheta: number,
  score: number,          // 1.0 = correct, 0.5 = partial, 0.0 = incorrect
  difficulty: number,
  questionNumber: number  // 1-based
): number {
  const probability = irtProbability(currentTheta, difficulty);
  const step = 0.4 / Math.sqrt(questionNumber); // decreasing step size
  return currentTheta + step * (score - probability);
}

/** Check if theta has converged (last N changes are all < threshold) */
export function checkConvergence(
  thetaHistory: number[],
  config: AdaptiveQuizConfig = DEFAULT_CONFIG
): boolean {
  if (thetaHistory.length < config.convergenceWindow + 1) return false;
  const recent = thetaHistory.slice(-config.convergenceWindow - 1);
  for (let i = 1; i < recent.length; i++) {
    if (Math.abs(recent[i] - recent[i - 1]) >= config.convergenceThreshold) {
      return false;
    }
  }
  return true;
}

/** Select next question: closest difficulty to current theta from remaining pool */
export function selectNextQuestion(
  state: AdaptiveQuizState,
  pool: AdaptiveQuizItem[]
): AdaptiveQuizItem | null {
  const remaining = pool.filter(q => state.remainingPool.includes(q.id));
  if (remaining.length === 0) return null;

  // Sort by distance from current theta, pick closest
  remaining.sort((a, b) =>
    Math.abs(a.difficulty - state.currentTheta) - Math.abs(b.difficulty - state.currentTheta)
  );
  return remaining[0];
}

// ── Question Pool Builder ───────────────────────────────────────────────────

/** Build question pool from existing lesson quiz data */
export function buildQuestionPool(courseId: string, lessonIds?: string[]): AdaptiveQuizItem[] {
  const course = getCourse(courseId);
  if (!course) return [];

  const targetLessons = lessonIds?.length ? lessonIds : (course.lessonIds || []);
  const items: AdaptiveQuizItem[] = [];

  for (const lid of targetLessons) {
    const lesson = getLesson(lid);
    if (!lesson?.plan) continue;

    const plan = lesson.plan;

    // Extract from plan's seed_quiz
    const seedQuiz = plan.seed_quiz || [];
    for (const q of seedQuiz) {
      if (typeof q === "string" && q.length > 10) {
        items.push({
          id: uid(),
          question: q,
          expectedAnswer: "", // Will be evaluated by AI
          difficulty: 0,      // Default medium
          topicName: plan.topic || lesson.title,
          lessonId: lid,
          historicalCorrectRate: 0.5,
        });
      }
    }

    // Extract from modules' mini_quiz
    for (const mod of plan.modules || []) {
      // TODO: type properly — plan modules have loose schema from AI generation
      const modRec = mod as unknown as Record<string, unknown>;
      const lessons = Array.isArray(modRec.lessons) ? (modRec.lessons as Record<string, unknown>[]) : [];
      const miniQuiz: unknown[] = lessons.flatMap((l) => Array.isArray(l.mini_quiz) ? (l.mini_quiz as unknown[]) : []);
      for (const q of miniQuiz) {
        if (typeof q === "string" && q.length > 10) {
          items.push({
            id: uid(),
            question: q,
            expectedAnswer: "",
            difficulty: 0,
            topicName: (typeof modRec.title === "string" ? modRec.title : "") || plan.topic || "",
            lessonId: lid,
            historicalCorrectRate: 0.5,
          });
        }
      }
    }

    // Extract from cheatSheet quickQuiz
    if (lesson.cheatSheet?.quickQuiz?.length) {
      for (const qq of lesson.cheatSheet.quickQuiz) {
        items.push({
          id: uid(),
          question: qq.q,
          expectedAnswer: qq.a,
          difficulty: -1, // Easy (from cheat sheet)
          topicName: plan.topic || lesson.title,
          lessonId: lid,
          historicalCorrectRate: 0.7,
        });
      }
    }
  }

  // Assign difficulty spread: distribute items across -2 to +2 range based on source
  // Items from seed_quiz: medium (0), cheatSheet: easy (-1), miniQuiz: hard (+1)
  return items;
}

// ── Session Management ──────────────────────────────────────────────────────

export function startSession(courseId: string, lessonIds?: string[]): AdaptiveQuizState {
  const pool = buildQuestionPool(courseId, lessonIds);
  const sessionId = `aq-${uid()}`;

  const state: AdaptiveQuizState = {
    sessionId,
    courseId,
    currentTheta: 0,
    thetaHistory: [0],
    questionsAsked: [],
    remainingPool: pool.map(q => q.id),
    isComplete: false,
    createdAt: new Date().toISOString(),
  };

  // Store pool alongside session
  const internalState: InternalSession = { ...state, _pool: pool };
  sessions.set(sessionId, internalState);

  logger.info(`[ADAPTIVE_QUIZ] Session started: ${sessionId} | pool=${pool.length} questions`);
  return state;
}

export function getSession(sessionId: string): AdaptiveQuizState | null {
  return sessions.get(sessionId) || null;
}

export function getSessionPool(sessionId: string): AdaptiveQuizItem[] {
  const state = sessions.get(sessionId);
  return state?._pool || [];
}

export function getNextQuestion(sessionId: string): AdaptiveQuizItem | null {
  const state = sessions.get(sessionId);
  if (!state || state.isComplete) return null;
  return selectNextQuestion(state, state._pool);
}

export function submitAnswer(
  sessionId: string,
  itemId: string,
  grade: "correct" | "partial" | "incorrect",
  config: AdaptiveQuizConfig = DEFAULT_CONFIG
): AdaptiveQuizState | null {
  const state = sessions.get(sessionId);
  if (!state || state.isComplete) return null;

  const pool = state._pool;
  const item = pool.find(q => q.id === itemId);
  if (!item) return null;

  // Convert grade to score
  const score = grade === "correct" ? 1.0 : grade === "partial" ? 0.5 : 0.0;
  const questionNumber = state.questionsAsked.length + 1;

  // Update theta
  const newTheta = updateTheta(state.currentTheta, score, item.difficulty, questionNumber);
  state.currentTheta = newTheta;
  state.thetaHistory.push(newTheta);

  // Record response
  state.questionsAsked.push({ itemId, response: grade, thetaAfter: newTheta });
  state.remainingPool = state.remainingPool.filter((id: string) => id !== itemId);

  // Check stopping conditions
  if (questionNumber >= config.maxQuestions) {
    state.isComplete = true;
    state.stoppingReason = "max_questions";
  } else if (checkConvergence(state.thetaHistory, config)) {
    state.isComplete = true;
    state.stoppingReason = "converged";
  } else if (state.remainingPool.length === 0) {
    state.isComplete = true;
    state.stoppingReason = "max_questions"; // pool exhausted
  }

  logger.info(`[ADAPTIVE_QUIZ] ${sessionId} | Q${questionNumber} ${grade} | θ=${newTheta.toFixed(2)} | complete=${state.isComplete}`);
  return state;
}

export function endSession(sessionId: string): AdaptiveQuizSummary | null {
  const state = sessions.get(sessionId);
  if (!state) return null;

  state.isComplete = true;
  state.stoppingReason = state.stoppingReason || "user_stopped";

  const pool = state._pool;
  const topicMap = new Map<string, { correct: number; total: number }>();

  for (const qa of state.questionsAsked) {
    const item = pool.find(q => q.id === qa.itemId);
    const topic = item?.topicName || "unknown";
    if (!topicMap.has(topic)) topicMap.set(topic, { correct: 0, total: 0 });
    const t = topicMap.get(topic)!;
    t.total++;
    if (qa.response === "correct") t.correct++;
  }

  const summary: AdaptiveQuizSummary = {
    sessionId,
    finalTheta: state.currentTheta,
    totalQuestions: state.questionsAsked.length,
    correct: state.questionsAsked.filter((q) => q.response === "correct").length,
    partial: state.questionsAsked.filter((q) => q.response === "partial").length,
    incorrect: state.questionsAsked.filter((q) => q.response === "incorrect").length,
    stoppingReason: state.stoppingReason,
    topicBreakdown: Array.from(topicMap.entries()).map(([topicName, stats]) => ({
      topicName,
      ...stats,
    })),
  };

  // Cleanup session after summary
  sessions.delete(sessionId);

  return summary;
}
