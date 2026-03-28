import React from "react";
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
  total,
  countLecture,
  countSlides,
  countBoth,
  filterSource,
  setFilterSource,
  filterImportance,
  setFilterImportance,
  sortKey,
  setSortKey,
}) => (
  <header className="ln-header mb-3">
    <div>
      <h2 className="panel__title mb-1">{t("lecturerNote.title")}</h2>
      <p className="muted small">
        {t("lecturerNote.desc")}
      </p>
    </div>

    {total > 0 && (
      <div className="ln-summary-row">
        <span className="ln-summary-chip">
          <span className="ln-summary-label">{t("lecturerNote.total")}</span>
          <span className="ln-summary-value">{total}</span>
        </span>
        <span className="ln-summary-chip">
          <span className="ln-summary-label">{t("lecturerNote.lectureOnly")}</span>
          <span className="ln-summary-value">{countLecture}</span>
        </span>
        <span className="ln-summary-chip">
          <span className="ln-summary-label">{t("lecturerNote.lectureSlides")}</span>
          <span className="ln-summary-value">{countBoth}</span>
        </span>
        <span className="ln-summary-chip">
          <span className="ln-summary-label">{t("lecturerNote.slideOnly")}</span>
          <span className="ln-summary-value">{countSlides}</span>
        </span>
      </div>
    )}

    <div className="ln-toolbar">
      <div className="ln-filter-group">
        <span className="ln-filter-label small">{t("lecturerNote.source")}</span>
        <div className="ln-filter-chips">
          {getSourceOptions().map((f) => (
            <button
              key={f.id}
              type="button"
              className={
                "ln-filter-chip" +
                (filterSource === f.id ? " ln-filter-chip--active" : "")
              }
              onClick={() => setFilterSource(f.id as "all" | EmphasisSource)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ln-filter-group">
        <span className="ln-filter-label small">{t("lecturerNote.importance")}</span>
        <div className="ln-filter-chips">
          {getImportanceOptions().map((f) => (
            <button
              key={f.id}
              type="button"
              className={
                "ln-filter-chip" +
                (filterImportance === f.id ? " ln-filter-chip--active" : "")
              }
              onClick={() => setFilterImportance(f.id as "all" | Importance)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ln-sort">
        <span className="ln-filter-label small">{t("lecturerNote.sort")}</span>
        <select
          className="ln-sort-select"
          value={sortKey}
          onChange={(e) =>
            setSortKey(e.target.value as "recommended" | "lo" | "order")
          }
        >
          <option value="recommended">{t("lecturerNote.recommended")}</option>
          <option value="lo">{t("lecturerNote.byLO")}</option>
          <option value="order">{t("lecturerNote.lectureOrder")}</option>
        </select>
      </div>
    </div>
  </header>
);

export default LecturerNoteHeader;
