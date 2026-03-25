import React from "react";
import { EnrichedEmphasis, LoMap } from "./types";
import { getImportance, getImportanceChip, getSourceChip } from "./utils";

type Props = {
  selected: EnrichedEmphasis;
  loMap: LoMap;
  openSelfCheckIdx: number | null;
  setOpenSelfCheckIdx: (v: number | null) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

const EmphasisDetailModal: React.FC<Props> = ({
  selected,
  loMap,
  openSelfCheckIdx,
  setOpenSelfCheckIdx,
  onClose,
  onPrev,
  onNext,
}) => {
  const srcChip = getSourceChip(selected);
  const importance = getImportance(selected);
  const impChip = getImportanceChip(importance);
  const loIds: string[] = (selected as any).related_lo_ids || [];
  const loLabels = loIds
    .map((id) => (loMap[id] ? `${id} \– ${loMap[id].title}` : id))
    .join(", ");

  const selfCheckItems = [
    {
      q: "Can you explain this idea in your own words in 1\–2 sentences?",
      a: selected.statement || "Summarise it in your own words.",
    },
    {
      q: "Which example from the lecture best illustrates this point?",
      a:
        (selected as any).from_transcript_quote ||
        "Recall one concrete example the instructor used.",
    },
    {
      q: "Which LO(s) would this most likely appear under in an exam?",
      a:
        loIds
          .map((id: string) =>
            loMap[id] ? `${id} \– ${loMap[id].title}` : id
          )
          .join(", ") || "Match it to the most relevant LO.",
    },
  ];

  return (
    <div className="ln-modal-backdrop" onClick={onClose}>
      <div className="ln-modal" onClick={(e) => e.stopPropagation()}>
        <header className="ln-modal-header">
          <div className="ln-modal-chips">
            <span className={srcChip.className} title={srcChip.tooltip}>
              <span className="ln-chip-icon">{srcChip.icon}</span>
              <span className="ln-chip-label">{srcChip.label}</span>
            </span>

            {loIds.length > 0 && (
              <span className="ln-chip ln-chip--lo">{loLabels}</span>
            )}

            <span className={impChip.className}>{impChip.label}</span>
          </div>

          <button
            type="button"
            className="ln-modal-close"
            onClick={onClose}
          >
            {"\✕"}
          </button>
        </header>

        <main className="ln-modal-body">
          <section className="ln-modal-section">
            <h3 className="ln-section-title">Core idea</h3>
            <p className="ln-core-text">
              {selected.statement || "Untitled emphasis"}
            </p>
          </section>

          {selected.why && (
            <section className="ln-modal-section">
              <h3 className="ln-section-title">Why it matters</h3>
              <p className="ln-body-text">{selected.why}</p>
            </section>
          )}

          {((selected as any).from_transcript_quote ||
            (selected as any).from_slide_quote) && (
            <section className="ln-modal-section ln-modal-section--split">
              <div className="ln-quote-block">
                <div className="ln-quote-label small">From lecture</div>
                <blockquote className="ln-quote">
                  {(selected as any).from_transcript_quote || "\—"}
                </blockquote>
              </div>
              <div className="ln-quote-block">
                <div className="ln-quote-label small">From slides</div>
                <blockquote className="ln-quote ln-quote--slide">
                  {(selected as any).from_slide_quote || "\—"}
                </blockquote>
              </div>
            </section>
          )}

          <section className="ln-modal-section">
            <h3 className="ln-section-title">Quick self-check</h3>
            <ul className="ln-selfcheck-list">
              {selfCheckItems.map((item, idx) => (
                <li key={idx} className="ln-selfcheck-item">
                  <button
                    type="button"
                    className="ln-selfcheck-question"
                    onClick={() =>
                      setOpenSelfCheckIdx(
                        openSelfCheckIdx === idx ? null : idx
                      )
                    }
                  >
                    {item.q}
                  </button>
                  {openSelfCheckIdx === idx && (
                    <p className="ln-selfcheck-answer small">{item.a}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </main>

        <footer className="ln-modal-footer">
          <div className="ln-modal-nav">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onPrev}
            >
              {"←"} Previous
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onNext}
            >
              Next {"→"}
            </button>
          </div>
          <div className="ln-modal-hint small muted">
            Tip: You can treat each card as a mini flashcard. Clear all
            questions in the self-check section before marking this topic as
            "done".
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EmphasisDetailModal;
