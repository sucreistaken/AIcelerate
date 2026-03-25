import React from "react";
import { EmphasisSource, Importance } from "./types";

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

const sourceOptions = [
  { id: "all", label: "All" },
  { id: "lecture", label: "Lecture only" },
  { id: "both", label: "Lecture + slides" },
  { id: "slides", label: "Slide only" },
] as const;

const importanceOptions = [
  { id: "all", label: "All" },
  { id: "high", label: "High" },
  { id: "medium", label: "Normal" },
  { id: "low", label: "Low" },
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
      <h2 className="panel__title mb-1">Teacher Notes</h2>
      <p className="muted small">
        Processed highlights of what the instructor really stressed in the
        lecture. Click a card to see the full explanation and self-check
        questions.
      </p>
    </div>

    {total > 0 && (
      <div className="ln-summary-row">
        <span className="ln-summary-chip">
          <span className="ln-summary-label">Total</span>
          <span className="ln-summary-value">{total}</span>
        </span>
        <span className="ln-summary-chip">
          <span className="ln-summary-label">Lecture only</span>
          <span className="ln-summary-value">{countLecture}</span>
        </span>
        <span className="ln-summary-chip">
          <span className="ln-summary-label">Lecture + slides</span>
          <span className="ln-summary-value">{countBoth}</span>
        </span>
        <span className="ln-summary-chip">
          <span className="ln-summary-label">Slide only</span>
          <span className="ln-summary-value">{countSlides}</span>
        </span>
      </div>
    )}

    <div className="ln-toolbar">
      <div className="ln-filter-group">
        <span className="ln-filter-label small">Source</span>
        <div className="ln-filter-chips">
          {sourceOptions.map((f) => (
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
        <span className="ln-filter-label small">Importance</span>
        <div className="ln-filter-chips">
          {importanceOptions.map((f) => (
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
        <span className="ln-filter-label small">Sort</span>
        <select
          className="ln-sort-select"
          value={sortKey}
          onChange={(e) =>
            setSortKey(e.target.value as "recommended" | "lo" | "order")
          }
        >
          <option value="recommended">Recommended</option>
          <option value="lo">By LO</option>
          <option value="order">Lecture order</option>
        </select>
      </div>
    </div>
  </header>
);

export default LecturerNoteHeader;
