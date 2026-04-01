import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { loProgressApi } from "../services/api";
import { useCourseStore } from "../stores/courseStore";
import { t } from "../utils/i18n";
import { Badge } from "./ui/Badge";
import { ProgressRing } from "./ui/ProgressRing";
import { Spinner } from "./ui/Spinner";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import type { LODashboardData, LOProgress } from "../types";

const MASTERY_CONFIG: Record<string, { color: string; bg: string }> = {
  not_started: { color: "var(--muted)", bg: "var(--input-bg)" },
  beginning: { color: "var(--danger)", bg: "var(--danger-bg)" },
  developing: { color: "var(--warning)", bg: "var(--warning-bg)" },
  proficient: { color: "var(--accent-2)", bg: "var(--accent-2-soft)" },
  mastered: { color: "var(--success)", bg: "var(--success-bg)" },
};

const RECOMMENDATION_LABELS: Record<string, string> = {
  study_module: "Modülü çalış",
  review_flashcards: "Flashcard'ları tekrar et",
  take_quiz: "Quiz çöz",
  complete: "Tamamlandı",
};

function LOCard({ lo, index }: { lo: LOProgress; index: number }) {
  const config = MASTERY_CONFIG[lo.masteryLevel] || MASTERY_CONFIG.not_started;

  return (
    <motion.div
      className="lc-card lc-card--outlined lc-card--pad-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--muted)" }}>{lo.loId}</span>
            <Badge
              size="sm"
              style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.color}` }}
            >
              {t(`loProgress.${lo.masteryLevel}`)}
            </Badge>
          </div>
          <p style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)", margin: 0, lineHeight: "var(--lh-normal)" }}>
            {lo.loTitle}
          </p>
        </div>
        <ProgressRing
          progress={lo.overallConfidence}
          size={48}
          strokeWidth={4}
          color={config.color}
        />
      </div>

      {/* Metrics row */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        {lo.quizScores.length > 0 && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            {t("loProgress.quizScores")}: {lo.quizScores.map(s => `${Math.round(s * 100)}%`).join(", ")}
          </div>
        )}
        {lo.flashcardMastery.total > 0 && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            {t("loProgress.flashcardMastery")}: {lo.flashcardMastery.graduated}/{lo.flashcardMastery.total}
          </div>
        )}
        <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
          {lo.lessonsContributing.length} ders
        </div>
      </div>

      {/* Recommendation */}
      {lo.masteryLevel !== "mastered" && (
        <div style={{ marginTop: 8, fontSize: "var(--text-xs)", color: config.color, fontWeight: 500 }}>
          {t("loProgress.recommendation")}: {RECOMMENDATION_LABELS[lo.recommendedNext] || lo.recommendedNext}
        </div>
      )}
    </motion.div>
  );
}

export default function LOProgressPane() {
  const [data, setData] = useState<LODashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const courseId = useCourseStore(s => s.currentCourseId);

  const fetchData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await loProgressApi.get(courseId);
      if (res.ok && res.loProgress) {
        setData(res as LODashboardData);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await loProgressApi.refresh(courseId);
      if (res.ok && res.loProgress) setData(res as LODashboardData);
    } finally {
      setLoading(false);
    }
  };

  if (!courseId) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Lütfen bir kurs seçin.</div>;
  }

  return (
    <div className="grid-gap-16">
      <PaneInfoBanner
        id="lo-progress"
        title={t("loProgress.title")}
        description="Öğrenme çıktıları bazında hakimiyetinizi takip edin. Quiz, flashcard ve ders verilerinden hesaplanır."
        tips={["ÖÇ hakimiyeti", "Çalışma önceliği", "Otomatik hesaplama"]}
      />

      {loading && <div style={{ textAlign: "center", padding: 40 }}><Spinner size="lg" /></div>}

      {!loading && data && (
        <>
          {/* Overall mastery header */}
          <div className="lc-card lc-card--elevated lc-card--pad-md" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ProgressRing progress={data.overallMastery} size={64} strokeWidth={5} />
              <div>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text)" }}>
                  {t("loProgress.overallMastery")}
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>
                  {data.totalLOs} ÖÇ
                </div>
              </div>
            </div>
            <button
              className="lc-button lc-button--secondary lc-button--sm"
              onClick={handleRefresh}
            >
              {t("loProgress.refresh")}
            </button>
          </div>

          {/* Study priority */}
          {data.studyPriority.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--muted)" }}>
                {t("loProgress.studyPriority")}:
              </span>
              {data.studyPriority.slice(0, 5).map((loId, i) => (
                <Badge key={loId} variant={i === 0 ? "danger" : i === 1 ? "warning" : "default"} size="sm">
                  {loId}
                </Badge>
              ))}
            </div>
          )}

          {/* LO cards grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {data.loProgress.map((lo, i) => (
              <LOCard key={lo.loId} lo={lo} index={i} />
            ))}
          </div>

          {data.loProgress.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              Bu kurs için henüz öğrenme çıktısı tanımlanmamış.
            </div>
          )}
        </>
      )}
    </div>
  );
}
