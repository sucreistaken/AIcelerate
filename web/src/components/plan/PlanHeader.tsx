import { motion } from "framer-motion";
import { useState } from "react";
import { Plan, ConfidenceScore } from "../../types";
import { ConfidenceBadge } from "../ui/ConfidenceBadge";
import { exportToPdf } from "../../utils/pdfExport";
import { t } from "../../utils/i18n";
import { logger } from "../../utils/logger";

const diffConfig: Record<string, { labelKey: string; cls: string }> = {
  Beginner:     { labelKey: "plan.diffBeginner",     cls: "pp__diff--easy" },
  Intermediate: { labelKey: "plan.diffIntermediate",  cls: "pp__diff--medium" },
  Advanced:     { labelKey: "plan.diffAdvanced",      cls: "pp__diff--hard" },
};

interface Props {
  plan: Plan;
  confidence?: ConfidenceScore | null;
  planRef: React.RefObject<HTMLDivElement | null>;
}

export default function PlanHeader({ plan, confidence, planRef }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const diffKey = plan.difficulty || "Intermediate";
  const diff = diffConfig[diffKey] || diffConfig.Intermediate;

  const handleExportPdf = async () => {
    if (!planRef.current) return;
    setPdfLoading(true);
    try {
      await exportToPdf(planRef.current, plan.topic || "LessonPlan");
    } catch (err) {
      logger.error("PDF export error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <motion.header
      className="pp__header"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="pp__header-top">
        <div className="pp__header-left">
          <div className="pp__header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="9" y1="7" x2="16" y2="7" />
              <line x1="9" y1="11" x2="14" y2="11" />
            </svg>
          </div>
          <div>
            <h1 className="pp__title">{plan.topic || "Ogrenme Plani"}</h1>
            <div className="pp__meta">
              {plan.duration_weeks && (
                <span className="pp__meta-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {plan.duration_weeks} hafta
                </span>
              )}
              {plan.modules?.length ? (
                <span className="pp__meta-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  {plan.modules.length} modul
                </span>
              ) : null}
              {plan.key_concepts?.length ? (
                <span className="pp__meta-item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  {plan.key_concepts.length} ana kavram
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="pp__header-actions">
          {plan.difficulty && (
            <span className={`pp__diff ${diff.cls}`}>
              {t(diff.labelKey)}
            </span>
          )}
          <ConfidenceBadge score={confidence} compact />
          <button
            className="pp__export-btn"
            onClick={handleExportPdf}
            disabled={pdfLoading}
            title="PDF olarak indir"
          >
            {pdfLoading ? (
              <svg className="pp__spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            )}
            <span>PDF</span>
          </button>
        </div>
      </div>
    </motion.header>
  );
}
