import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import { API_BASE } from "../config";
import { apiFetch } from "../services/fetchWithAuth";
import { Plan } from "../types";
import { useLessonStore } from "../stores/lessonStore";
import { useUiStore } from "../stores/uiStore";
import { useGamificationStore } from "../stores/gamificationStore";
import { exportToPdf } from "../utils/pdfExport";
import { withRetry } from "../utils/apiRetry";
import { logger } from "../utils/logger";
import { t } from "../utils/i18n";

const QUIZ_ANSWERS_KEY_PREFIX = 'lc.quiz.answers.';
const QUIZ_EVAL_KEY_PREFIX = 'lc.quiz.eval.';
const QUIZ_HISTORY_KEY_PREFIX = 'lc.quiz.history.';

export interface QuizEvalResult {
  grade: 'correct' | 'partial' | 'incorrect';
  feedback: string;
  missing_points: string[];
  confidence: number;
}

export interface QuizHistoryEntry {
  date: string;
  total: number;
  correct: number;
  partial: number;
  incorrect: number;
  score: number;
}

export interface DashboardStats {
  total: number;
  correct: number;
  partial: number;
  incorrect: number;
  score: number;
  topMissed: [string, number][];
}

export function parseDifficulty(q: string): { difficulty: string; cleanQ: string } {
  const match = q.match(/^\[(Easy|Medium|Hard)\]\s*/i);
  if (match) return { difficulty: match[1], cleanQ: q.slice(match[0].length) };
  return { difficulty: '', cleanQ: q };
}

export function getDifficultyColor(d: string): string {
  switch (d.toLowerCase()) {
    case 'easy': return 'var(--easy)';
    case 'medium': return 'var(--medium)';
    case 'hard': return 'var(--hard)';
    default: return 'var(--muted)';
  }
}

export function getDifficultyBg(d: string): string {
  switch (d.toLowerCase()) {
    case 'easy': return 'var(--easy-bg)';
    case 'medium': return 'var(--medium-bg)';
    case 'hard': return 'var(--hard-bg)';
    default: return 'var(--card-hover)';
  }
}

export function gradeColor(g: string) {
  return g === 'correct' ? 'var(--success)' : g === 'partial' ? 'var(--warning)' : 'var(--danger)';
}

export function gradeBg(g: string) {
  return g === 'correct' ? 'var(--success-soft)' : g === 'partial' ? 'var(--warning-soft)' : 'var(--danger-soft)';
}

export function gradeLabel(g: string) {
  return g === 'correct' ? 'Dogru' : g === 'partial' ? 'Kismen' : 'Yanlis';
}

export function useQuizPane(
  quiz: string[],
  setQuiz: (q: string[]) => void,
  hasPlan: boolean,
  plan: Plan | null,
) {
  const { currentLessonId } = useLessonStore();
  const setMode = useUiStore((s) => s.setMode);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [evalResults, setEvalResults] = useState<Record<number, QuizEvalResult>>({});
  const [loading, setLoading] = useState(false);
  const [loadingAns, setLoadingAns] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const quizContentRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    if (!quizContentRef.current) return;
    setPdfLoading(true);
    try {
      await exportToPdf(quizContentRef.current, "Quiz");
    } catch (err) {
      logger.error("PDF export error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    if (!currentLessonId) {
      setAnswers({});
      setEvalResults({});
      return;
    }

    const storageKey = QUIZ_ANSWERS_KEY_PREFIX + currentLessonId;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try { setAnswers(JSON.parse(savedData) || {}); }
      catch (e) { logger.error('Failed to parse saved quiz answers:', e); setAnswers({}); }
    } else { setAnswers({}); }

    const evalKey = QUIZ_EVAL_KEY_PREFIX + currentLessonId;
    const savedEval = localStorage.getItem(evalKey);
    if (savedEval) {
      try { setEvalResults(JSON.parse(savedEval) || {}); }
      catch { setEvalResults({}); }
    } else { setEvalResults({}); }
  }, [currentLessonId]);

  useEffect(() => {
    if (!currentLessonId || Object.keys(answers).length === 0) return;
    localStorage.setItem(QUIZ_ANSWERS_KEY_PREFIX + currentLessonId, JSON.stringify(answers));
  }, [answers, currentLessonId]);

  useEffect(() => {
    if (!currentLessonId || Object.keys(evalResults).length === 0) return;
    localStorage.setItem(QUIZ_EVAL_KEY_PREFIX + currentLessonId, JSON.stringify(evalResults));
  }, [evalResults, currentLessonId]);

  const generateQuizFromPlan = async () => {
    if (!plan) return;
    setLoading(true);
    try {
      const j = await withRetry(async () => {
        const r = await apiFetch(`${API_BASE}/api/quiz-from-plan`, {
          method: "POST",
          body: JSON.stringify({ plan, lessonId: currentLessonId }),
        });
        return await r.json();
      });
      if (j.ok && Array.isArray(j.questions)) {
        setQuiz(j.questions);
        setAnswers({});
        setEvalResults({});
        setUserAnswers({});
        setShowDashboard(false);
        if (currentLessonId) {
          localStorage.removeItem(QUIZ_ANSWERS_KEY_PREFIX + currentLessonId);
          localStorage.removeItem(QUIZ_EVAL_KEY_PREFIX + currentLessonId);
        }
      } else {
        toast.error(j.error || t("quiz.generateFailed"));
      }
    } catch (e: any) {
      toast.error(t("quiz.errorPrefix") + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswers = async () => {
    if (!quiz.length) return;
    setLoadingAns(true);
    try {
      const j = await withRetry(async () => {
        const r = await apiFetch(`${API_BASE}/api/quiz-answers`, {
          method: "POST",
          body: JSON.stringify({ questions: quiz, lessonId: currentLessonId }),
        });
        return await r.json();
      });
      if (j.ok && j.answers) {
        const map: Record<number, any> = {};
        j.answers.forEach((a: any, i: number) => { map[i] = a; });
        setAnswers(map);
      } else {
        toast.error(t("quiz.answersFailed"));
      }
    } catch (e: any) {
      toast.error(t("quiz.errorPrefix") + e.message);
    } finally {
      setLoadingAns(false);
    }
  };

  const saveToHistory = (results: QuizEvalResult[]) => {
    if (!currentLessonId) return;
    const historyKey = QUIZ_HISTORY_KEY_PREFIX + currentLessonId;
    let history: QuizHistoryEntry[] = [];
    try { history = JSON.parse(localStorage.getItem(historyKey) || '[]'); } catch {}

    const correct = results.filter(r => r.grade === 'correct').length;
    const partial = results.filter(r => r.grade === 'partial').length;
    const incorrect = results.filter(r => r.grade === 'incorrect').length;
    const total = results.length;
    const score = Math.round(((correct + partial * 0.5) / total) * 100);

    history.push({ date: new Date().toISOString(), total, correct, partial, incorrect, score });
    if (history.length > 10) history = history.slice(-10);
    localStorage.setItem(historyKey, JSON.stringify(history));
  };

  const evaluateAnswers = async () => {
    const items = quiz.map((q, i) => ({
      q: parseDifficulty(q).cleanQ,
      student_answer: userAnswers[i] || '',
    })).filter(item => item.student_answer.trim());

    if (items.length === 0) {
      toast.error(t("quiz.needAnswer"));
      return;
    }

    setEvaluating(true);
    try {
      const j = await withRetry(async () => {
        const r = await apiFetch(`${API_BASE}/api/quiz-eval-batch`, {
          method: "POST",
          body: JSON.stringify({ items, lessonId: currentLessonId }),
        });
        return await r.json();
      });
      if (j.ok && j.results) {
        const map: Record<number, QuizEvalResult> = {};
        j.results.forEach((r: any) => { map[r.index] = r; });
        setEvalResults(map);
        setShowDashboard(true);
        saveToHistory(j.results);
        const answeredCount = j.results.length;
        for (let i = 0; i < answeredCount; i++) {
          useGamificationStore.getState().addXp('quiz-answer');
        }
        toast.success(`${t("quiz.evalDone")} +${answeredCount * 10} XP`);
      } else {
        toast.error(t("quiz.evalFailed"));
      }
    } catch (e: any) {
      toast.error(t("quiz.errorPrefix") + e.message);
    } finally {
      setEvaluating(false);
    }
  };

  const quizHistory = useMemo<QuizHistoryEntry[]>(() => {
    if (!currentLessonId) return [];
    try { return JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY_PREFIX + currentLessonId) || '[]'); } catch { return []; }
  }, [currentLessonId, showDashboard]);

  const dashboardStats = useMemo<DashboardStats | null>(() => {
    const results = Object.values(evalResults);
    if (!results.length) return null;
    const correct = results.filter(r => r.grade === 'correct').length;
    const partial = results.filter(r => r.grade === 'partial').length;
    const incorrect = results.filter(r => r.grade === 'incorrect').length;
    const total = results.length;
    const score = Math.round(((correct + partial * 0.5) / total) * 100);

    const allMissed = results.flatMap(r => r.missing_points || []);
    const missedCount: Record<string, number> = {};
    allMissed.forEach(m => { missedCount[m] = (missedCount[m] || 0) + 1; });
    const topMissed = Object.entries(missedCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { total, correct, partial, incorrect, score, topMissed };
  }, [evalResults]);

  const handleCopy = () => {
    navigator.clipboard.writeText(quiz.join("\n")).catch(() => toast.error(t("error.clipboardFailed")));
    toast.success(t("error.copied"));
  };

  return {
    answers,
    userAnswers,
    setUserAnswers,
    evalResults,
    loading,
    loadingAns,
    evaluating,
    pdfLoading,
    showDashboard,
    quizContentRef,
    quizHistory,
    dashboardStats,
    setMode,
    handleExportPdf,
    generateQuizFromPlan,
    fetchAnswers,
    evaluateAnswers,
    handleCopy,
  };
}
