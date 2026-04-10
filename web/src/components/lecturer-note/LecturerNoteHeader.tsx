import React from "react";
import { motion } from "framer-motion";
import { EmphasisSource, Importance } from "./types";
import { t } from "../../utils/i18n";

type Props = {
  total: number;
  countLecture: number;
  countSlides: number;
  countBoth: number;
  filterSource: "all" | EmphasisSource;
  setFilterSource: (v: "all" | EmphasisSource) => void;
  filterImportance: "all" | Importance;
  setFilterImportance: (v: "all" | Importance) => void;
  sortKey: "recommended" | "lo" | "order";
  setSortKey: (v: "recommended" | "lo" | "order") => void;
};

const getSourceOptions = () => [
  { id: "all", label: t("lecturerNote.all") },
  { id: "lecture", label: t("lecturerNote.lectureOnly") },
  { id: "both", label: t("lecturerNote.lectureSlides") },
  { id: "slides", label: t("lecturerNote.slideOnly") },
] as const;

const getImportanceOptions = () => [
  { id: "all", label: t("lecturerNote.all") },
  { id: "high", label: t("lecturerNote.high") },
  { id: "medium", label: t("lecturerNote.normal") },
  { id: "low", label: t("lecturerNote.low") },
] as const;

const LecturerNoteHeader: React.FC<Props> = ({
  total, countLecture, countSlides, countBoth,
  filterSource, setFilterSource,
  filterImportance, setFilterImportance,
  sortKey, setSortKey,
}) => (
  <>
    {/* Stats Row */}
    {total > 0 && (
      <motion.div
        className="ln__stats"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06 }}
      >
        {[
          { value: total, label: t("lecturerNote.total"), cls: "ln__stat--total" },
          { value: countLecture, label: t("lecturerNote.lectureOnly"), cls: "ln__stat--lecture" },
          { value: countBoth, label: t("lecturerNote.lectureSlides"), cls: "ln__stat--both" },
          { value: countSlides, label: t("lecturerNote.slideOnly"), cls: "ln__stat--slides" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            className={`ln__stat ${s.cls}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.08 + i * 0.04 }}
          >
            <div className="ln__stat-value">{s.value}</div>
            <div className="ln__stat-label">{s.label}</div>
          </motion.div>
        ))}
      </motion.div>
    )}

    {/* Filters & Sort */}
    <motion.div
      className="ln__toolbar"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="ln__filter-group">
        <span className="ln__filter-label">{t("lecturerNote.source")}</span>
        <div className="ln__filter-chips">
          {getSourceOptions().map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ln__filter-chip${filterSource === f.id ? " ln__filter-chip--active" : ""}`}
              onClick={() => setFilterSource(f.id as "all" | EmphasisSource)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ln__filter-group">
        <span className="ln__filter-label">{t("lecturerNote.importance")}</span>
        <div className="ln__filter-chips">
          {getImportanceOptions().map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ln__filter-chip${filterImportance === f.id ? " ln__filter-chip--active" : ""}`}
              onClick={() => setFilterImportance(f.id as "all" | Importance)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ln__sort-group">
        <span className="ln__filter-label">{t("lecturerNote.sort")}</span>
        <select
          className="ln__sort-select"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as "recommended" | "lo" | "order")}
        >
          <option value="recommended">{t("lecturerNote.recommended")}</option>
          <option value="lo">{t("lecturerNote.byLO")}</option>
          <option value="order">{t("lecturerNote.lectureOrder")}</option>
        </select>
      </div>
    </motion.div>
  </>
);

export default LecturerNoteHeader;
