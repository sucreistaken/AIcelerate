import React from "react";
import { motion } from "framer-motion";
import { t } from "../../utils/i18n";

type Props = {
  learningOutcomes: string[];
};

const LearningOutcomesCard: React.FC<Props> = ({ learningOutcomes }) => (
  <motion.section
    className="ln__lo-section"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: 0.15 }}
  >
    <div className="ln__lo-header">
      <div className="ln__lo-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <h3 className="ln__lo-title">Learning Outcomes (LO)</h3>
      {learningOutcomes?.length > 0 && (
        <span className="ln__lo-count">{learningOutcomes.length}</span>
      )}
    </div>

    {learningOutcomes && learningOutcomes.length > 0 ? (
      <div className="ln__lo-list">
        {learningOutcomes.map((lo, i) => (
          <motion.div
            key={i}
            className="ln__lo-item"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.18 + i * 0.03 }}
          >
            <span className="ln__lo-code">LO{i + 1}</span>
            <span className="ln__lo-desc">{lo}</span>
          </motion.div>
        ))}
      </div>
    ) : (
      <p className="ln__lo-empty">
        {t("lecturerNote.noLO") || "Henuz ogrenme ciktisi eklenmedi. Syllabus'tan cektikten sonra burada listelenecek."}
      </p>
    )}
  </motion.section>
);

export default LearningOutcomesCard;
