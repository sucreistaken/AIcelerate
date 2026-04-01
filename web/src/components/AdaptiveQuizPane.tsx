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
  // Map theta (-3..+3) to 0..1 for display
  const normalized = Math.max(0, Math.min(1, (theta + 3) / 6));
  const label = theta > 1 ? "Yüksek" : theta > -0.5 ? "Orta" : "Düşük";
  const color = theta > 1 ? "var(--success)" : theta > -0.5 ? "var(--accent-2)" : "var(--warning)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <ProgressRing progress={normalized} size={56} strokeWidth={5} color={color} showPercent={false} />
      <div>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text)" }}>
          {t("adaptiveQuiz.ability")}
        </div>
        <div style={{ fontSize: "var(--text-xs)", color }}>
          {label} ({theta.toFixed(2)})
        </div>
      </div>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const variant = grade === "correct" ? "success" : grade === "partial" ? "warning" : "danger";
  const key = `adaptiveQuiz.${grade}` as any;
  return <Badge variant={variant} size="md">{t(key)}</Badge>;
}

function SummaryView({ summary }: { summary: AdaptiveQuizSummary }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid-gap-16">
      <div className="lc-card lc-card--elevated lc-card--pad-lg" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "var(--text-2xl)", fontWeight: 700, marginBottom: 8 }}>
          {t("adaptiveQuiz.complete")}
        </div>
        <ThetaGauge theta={summary.finalTheta} />
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--success)" }}>{summary.correct}</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>{t("adaptiveQuiz.correct")}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--warning)" }}>{summary.partial}</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>{t("adaptiveQuiz.partial")}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--danger)" }}>{summary.incorrect}</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>{t("adaptiveQuiz.incorrect")}</div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: "var(--text-xs)", color: "var(--muted)" }}>
          {summary.stoppingReason === "converged" ? t("adaptiveQuiz.converged") : t("adaptiveQuiz.maxReached")}
        </div>
      </div>

      {summary.topicBreakdown.length > 0 && (
        <div className="lc-card lc-card--outlined lc-card--pad-md">
          <h3 style={{ fontSize: "var(--text-md)", fontWeight: 600, marginBottom: 12 }}>
            {t("adaptiveQuiz.topicBreakdown")}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {summary.topicBreakdown.map((topic, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{topic.topicName}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                    {topic.correct}/{topic.total}
                  </span>
                  <ProgressRing
                    progress={topic.total > 0 ? topic.correct / topic.total : 0}
                    size={28}
                    strokeWidth={3}
                  />
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
    setLoading(true);
    setSummary(null);
    setLastGrade(null);
    try {
      const res = await adaptiveQuizApi.start(courseId);
      if (res.ok && res.sessionId) {
        setSession({
          sessionId: res.sessionId!,
          currentTheta: res.currentTheta ?? 0,
          questionsAsked: res.questionsAsked ?? 0,
          isComplete: false,
          nextQuestion: res.nextQuestion ?? null,
          poolSize: res.poolSize,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const handleSubmit = async () => {
    if (!session?.nextQuestion || !answer.trim()) return;
    setSubmitting(true);
    setLastGrade(null);
    try {
      const res = await adaptiveQuizApi.submitAnswer(session.sessionId, session.nextQuestion.id, answer);
      if (res.ok) {
        setLastGrade(res.grade || null);
        setAnswer("");
        setSession(prev => prev ? {
          ...prev,
          currentTheta: res.currentTheta ?? prev.currentTheta,
          questionsAsked: res.questionsAsked ?? prev.questionsAsked,
          isComplete: res.isComplete ?? false,
          stoppingReason: res.stoppingReason,
          nextQuestion: res.nextQuestion ?? null,
        } : null);

        if (res.isComplete) {
          const endRes = await adaptiveQuizApi.endSession(session.sessionId);
          if (endRes.ok && endRes.summary) setSummary(endRes.summary);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnd = async () => {
    if (!session) return;
    const res = await adaptiveQuizApi.endSession(session.sessionId);
    if (res.ok && res.summary) {
      setSummary(res.summary);
      setSession(null);
    }
  };

  if (!courseId) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Lütfen bir kurs seçin.</div>;
  }

  if (summary) {
    return (
      <div className="grid-gap-16">
        <SummaryView summary={summary} />
        <div style={{ textAlign: "center" }}>
          <button className="lc-button lc-button--primary lc-button--md" onClick={handleStart}>
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid-gap-16">
        <PaneInfoBanner
          id="adaptive-quiz"
          title={t("adaptiveQuiz.title")}
          description="AI seviyenizi belirler ve zorluğu otomatik ayarlar. Doğru cevaplarda zorluk artar, yanlışlarda azalır."
          tips={["Adaptif zorluk", "IRT-lite motor", "Konu analizi", "Yakınsama tespiti"]}
        />
        <div style={{ textAlign: "center", padding: 40 }}>
          <button
            className="lc-button lc-button--primary lc-button--lg"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : t("adaptiveQuiz.start")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-gap-16">
      {/* Header: theta + progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <ThetaGauge theta={session.currentTheta} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>
            {t("adaptiveQuiz.questionOf")} {session.questionsAsked + 1}/{session.poolSize || 10}
          </span>
          <button className="lc-button lc-button--ghost lc-button--sm" onClick={handleEnd}>
            Bitir
          </button>
        </div>
      </div>

      {/* Last grade feedback */}
      <AnimatePresence>
        {lastGrade && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: "center" }}
          >
            <GradeBadge grade={lastGrade} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question */}
      {session.nextQuestion && (
        <motion.div
          key={session.nextQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lc-card lc-card--elevated lc-card--pad-lg"
        >
          <div style={{ marginBottom: 8 }}>
            <Badge variant="soft" size="sm">{session.nextQuestion.topicName}</Badge>
          </div>
          <p style={{ fontSize: "var(--text-md)", fontWeight: 500, lineHeight: "var(--lh-relaxed)", color: "var(--text)", marginBottom: 16 }}>
            {session.nextQuestion.question}
          </p>
          <textarea
            className="lc-input-field lc-input-field--md"
            rows={3}
            placeholder="Cevabınızı yazın..."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
            style={{ width: "100%", resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button
              className="lc-button lc-button--primary lc-button--md"
              onClick={handleSubmit}
              disabled={submitting || !answer.trim()}
            >
              {submitting ? <Spinner size="sm" /> : t("adaptiveQuiz.submit")}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
