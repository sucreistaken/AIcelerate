import { motion } from "framer-motion";
import { LearningOutcome } from "../../types";

interface Props {
  outcomes: LearningOutcome[];
}

export default function PlanLearningOutcomes({ outcomes }: Props) {
  if (!outcomes.length) return null;

  const covered = outcomes.filter((lo) => lo.covered).length;

  return (
    <motion.section
      className="pp__outcomes"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <div className="pp__section-header">
        <div className="pp__section-icon pp__section-icon--lo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="pp__section-title">Learning Outcomes</h2>
        <span className="pp__section-count">
          {covered}/{outcomes.length} covered
        </span>
      </div>

      <div className="pp__outcomes-list">
        {outcomes.map((lo, i) => (
          <motion.div
            key={i}
            className="pp__outcome"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.18 + i * 0.04 }}
          >
            <div className={`pp__outcome-indicator${lo.covered ? " pp__outcome-indicator--covered" : ""}`}>
              {lo.covered ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                </svg>
              )}
            </div>
            <div className="pp__outcome-body">
              <div className="pp__outcome-top">
                <span className="pp__outcome-code">{lo.code || `LO${i + 1}`}</span>
                {typeof lo.covered === "boolean" && (
                  <span className={`pp__outcome-status${lo.covered ? " pp__outcome-status--covered" : " pp__outcome-status--missing"}`}>
                    {lo.covered ? "Covered" : "Not fully covered"}
                  </span>
                )}
              </div>
              <p className="pp__outcome-desc">{lo.description}</p>
              {lo.covered_by_lessons?.length ? (
                <div className="pp__outcome-lessons">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  {lo.covered_by_lessons.join(", ")}
                </div>
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
