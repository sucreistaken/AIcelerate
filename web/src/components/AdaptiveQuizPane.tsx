import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { adaptiveQuizApi } from "../services/api";
import { useCourseStore } from "../stores/courseStore";
import { t } from "../utils/i18n";
import { Badge } from "./ui/Badge";
import { ProgressRing } from "./ui/ProgressRing";
import { Spinner } from "./ui/Spinner";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import type { AdaptiveQuizSessionState, AdaptiveQuizSummary } from "../types";

function ThetaGauge({ theta }: { theta: number }) {
  const normalized = Math.max(0, Math.min(1, (theta + 3) / 6));
  const label = theta > 1 ? "Yuksek" : theta > -0.5 ? "Orta" : "Dusuk";
  const color = theta > 1 ? "var(--success)" : theta > -0.5 ? "var(--accent-2)" : "var(--warning)";

  return (
    <div className="aq__theta">
      <ProgressRing progress={normalized} size={56} strokeWidth={5} color={color} showPercent={false} />
      <div>
        <div className="aq__theta-label">{t("adaptiveQuiz.ability")}</div>
        <div className="aq__theta-value" style={{ color }}>{label} ({theta.toFixed(2)})</div>
      </div>
    </div>
  );
}

function SummaryView({ summary }: { summary: AdaptiveQuizSummary }) {
  return (
    <motion.div className="aq__summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="aq__summary-hero">
        <div className="aq__summary-title">{t("adaptiveQuiz.complete")}</div>
        <ThetaGauge theta={summary.finalTheta} />
        <div className="aq__summary-scores">
          <div className="aq__score aq__score--correct">
            <div className="aq__score-value">{summary.correct}</div>
            <div className="aq__score-label">{t("adaptiveQuiz.correct")}</div>
          </div>
          <div className="aq__score aq__score--partial">
            <div className="aq__score-value">{summary.partial}</div>
            <div className="aq__score-label">{t("adaptiveQuiz.partial")}</div>
          </div>
          <div className="aq__score aq__score--incorrect">
            <div className="aq__score-value">{summary.incorrect}</div>
            <div className="aq__score-label">{t("adaptiveQuiz.incorrect")}</div>
          </div>
        </div>
        <div className="aq__summary-reason">
          {summary.stoppingReason === "converged" ? t("adaptiveQuiz.converged") : t("adaptiveQuiz.maxReached")}
        </div>
      </div>

      {summary.topicBreakdown.length > 0 && (
        <div className="aq__breakdown">
          <h3 className="aq__breakdown-title">{t("adaptiveQuiz.topicBreakdown")}</h3>
          <div className="aq__breakdown-list">
            {summary.topicBreakdown.map((topic, i) => (
              <div key={i} className="aq__breakdown-item">
                <span className="aq__breakdown-name">{topic.topicName}</span>
                <div className="aq__breakdown-right">
                  <span className="aq__breakdown-score">{topic.correct}/{topic.total}</span>
                  <ProgressRing progress={topic.total > 0 ? topic.correct / topic.total : 0} size={28} strokeWidth={3} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function AdaptiveQuizPane() {
  const [session, setSession] = useState<AdaptiveQuizSessionState | null>(null);
  const [summary, setSummary] = useState<AdaptiveQuizSummary | null>(null);
  const [answer, setAnswer] = useState("");
  const [lastGrade, setLastGrade] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const courseId = useCourseStore(s => s.currentCourseId);

  const handleStart = useCallback(async () => {
    if (!courseId) return;
    setLoading(true); setSummary(null); setLastGrade(null);
    try {
      const res = await adaptiveQuizApi.start(courseId);
      if (res.ok && res.sessionId) {
        setSession({
          sessionId: res.sessionId!, currentTheta: res.currentTheta ?? 0,
          questionsAsked: res.questionsAsked ?? 0, isComplete: false,
          nextQuestion: res.nextQuestion ?? null, poolSize: res.poolSize,
        });
      }
    } finally { setLoading(false); }
  }, [courseId]);

  const handleSubmit = async () => {
    if (!session?.nextQuestion || !answer.trim()) return;
    setSubmitting(true); setLastGrade(null);
    try {
      const res = await adaptiveQuizApi.submitAnswer(session.sessionId, session.nextQuestion.id, answer);
      if (res.ok) {
        setLastGrade(res.grade || null); setAnswer("");
        setSession(prev => prev ? {
          ...prev, currentTheta: res.currentTheta ?? prev.currentTheta,
          questionsAsked: res.questionsAsked ?? prev.questionsAsked,
          isComplete: res.isComplete ?? false, stoppingReason: res.stoppingReason,
          nextQuestion: res.nextQuestion ?? null,
        } : null);
        if (res.isComplete) {
          const endRes = await adaptiveQuizApi.endSession(session.sessionId);
          if (endRes.ok && endRes.summary) setSummary(endRes.summary);
        }
      }
    } finally { setSubmitting(false); }
  };

  const handleEnd = async () => {
    if (!session) return;
    const res = await adaptiveQuizApi.endSession(session.sessionId);
    if (res.ok && res.summary) { setSummary(res.summary); setSession(null); }
  };

  if (!courseId) return <div className="aq__no-course">Lutfen bir kurs secin.</div>;

  if (summary) {
    return (
      <motion.div className="aq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        <SummaryView summary={summary} />
        <div className="aq__retry-wrap">
          <button className="aq__start-btn" onClick={handleStart}>Tekrar Dene</button>
        </div>
      </motion.div>
    );
  }

  if (!session) {
    return (
      <motion.div className="aq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        <PaneInfoBanner
          id="adaptive-quiz"
          title={t("adaptiveQuiz.title")}
          description="AI seviyenizi belirler ve zorlugu otomatik ayarlar. Dogru cevaplarda zorluk artar, yanlislarda azalir."
          tips={["Adaptif zorluk", "IRT-lite motor", "Konu analizi", "Yakinsama tespiti"]}
        />
        <motion.div
          className="aq__start-screen"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="aq__start-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <button className="aq__start-btn" onClick={handleStart} disabled={loading}>
            {loading ? <Spinner size="sm" /> : t("adaptiveQuiz.start")}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div className="aq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <div className="aq__session-header">
        <ThetaGauge theta={session.currentTheta} />
        <div className="aq__session-right">
          <span className="aq__progress-label">
            {t("adaptiveQuiz.questionOf")} {session.questionsAsked + 1}/{session.poolSize || 10}
          </span>
          <button className="aq__end-btn" onClick={handleEnd}>Bitir</button>
        </div>
      </div>

      <AnimatePresence>
        {lastGrade && (
          <motion.div className="aq__grade-feedback" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Badge variant={lastGrade === "correct" ? "success" : lastGrade === "partial" ? "warning" : "danger"} size="md">
              {t(`adaptiveQuiz.${lastGrade}` as any)}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {session.nextQuestion && (
        <motion.div className="aq__question" key={session.nextQuestion.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="aq__question-topic"><Badge variant="soft" size="sm">{session.nextQuestion.topicName}</Badge></div>
          <p className="aq__question-text">{session.nextQuestion.question}</p>
          <textarea
            className="aq__answer-input"
            rows={3}
            placeholder="Cevabinizi yazin..."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
          />
          <div className="aq__submit-row">
            <button className="aq__submit-btn" onClick={handleSubmit} disabled={submitting || !answer.trim()}>
              {submitting ? <Spinner size="sm" /> : t("adaptiveQuiz.submit")}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
