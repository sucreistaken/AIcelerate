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
  study_module: "Modulu calis",
  review_flashcards: "Flashcard'lari tekrar et",
  take_quiz: "Quiz coz",
  complete: "Tamamlandi",
};

function LOCard({ lo, index }: { lo: LOProgress; index: number }) {
  const config = MASTERY_CONFIG[lo.masteryLevel] || MASTERY_CONFIG.not_started;

  return (
    <motion.div
      className="lp__card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className="lp__card-top">
        <div className="lp__card-info">
          <div className="lp__card-id-row">
            <span className="lp__card-id">{lo.loId}</span>
            <Badge size="sm" style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.color}` }}>
              {t(`loProgress.${lo.masteryLevel}`)}
            </Badge>
          </div>
          <p className="lp__card-title">{lo.loTitle}</p>
        </div>
        <ProgressRing progress={lo.overallConfidence} size={48} strokeWidth={4} color={config.color} />
      </div>

      <div className="lp__card-metrics">
        {lo.quizScores.length > 0 && (
          <span className="lp__metric">Quiz: {lo.quizScores.map(s => `${Math.round(s * 100)}%`).join(", ")}</span>
        )}
        {lo.flashcardMastery.total > 0 && (
          <span className="lp__metric">FC: {lo.flashcardMastery.graduated}/{lo.flashcardMastery.total}</span>
        )}
        <span className="lp__metric">{lo.lessonsContributing.length} ders</span>
      </div>

      {lo.masteryLevel !== "mastered" && (
        <div className="lp__card-rec" style={{ color: config.color }}>
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
      if (res.ok && res.loProgress) setData(res as LODashboardData);
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
    return <div className="lp__no-course">Lutfen bir kurs secin.</div>;
  }

  return (
    <motion.div
      className="lp"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <PaneInfoBanner
        id="lo-progress"
        title={t("loProgress.title")}
        description="Ogrenme ciktilari bazinda hakimiyetinizi takip edin. Quiz, flashcard ve ders verilerinden hesaplanir."
        tips={["OC hakimiyeti", "Calisma onceligi", "Otomatik hesaplama"]}
      />

      <motion.div
        className="lp__hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="lp__hero-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
          </svg>
        </div>
        <h1 className="lp__hero-title">{t("loProgress.title")}</h1>
      </motion.div>

      {loading && <div className="lp__loading"><Spinner size="lg" /></div>}

      {!loading && data && (
        <>
          <motion.div
            className="lp__mastery-header"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <div className="lp__mastery-left">
              <ProgressRing progress={data.overallMastery} size={64} strokeWidth={5} />
              <div>
                <div className="lp__mastery-title">{t("loProgress.overallMastery")}</div>
                <div className="lp__mastery-sub">{data.totalLOs} OC</div>
              </div>
            </div>
            <button className="lp__refresh-btn" onClick={handleRefresh}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              {t("loProgress.refresh")}
            </button>
          </motion.div>

          {data.studyPriority.length > 0 && (
            <div className="lp__priority">
              <span className="lp__priority-label">{t("loProgress.studyPriority")}:</span>
              {data.studyPriority.slice(0, 5).map((loId, i) => (
                <Badge key={loId} variant={i === 0 ? "danger" : i === 1 ? "warning" : "default"} size="sm">{loId}</Badge>
              ))}
            </div>
          )}

          <div className="lp__grid">
            {data.loProgress.map((lo, i) => <LOCard key={lo.loId} lo={lo} index={i} />)}
          </div>

          {data.loProgress.length === 0 && (
            <div className="lp__no-course">Bu kurs icin henuz ogrenme ciktisi tanimlanmamis.</div>
          )}
        </>
      )}
    </motion.div>
  );
}
