import React from "react";
import { EnrichedEmphasis, LoMap } from "./types";
import { getImportance, getImportanceChip, getSourceChip, truncate } from "./utils";
import { t } from "../../utils/i18n";

type Props = {
  visible: EnrichedEmphasis[];
  loMap: LoMap;
  onOpenModal: (idx: number) => void;
};

const EmphasisCardGrid: React.FC<Props> = ({ visible, loMap, onOpenModal }) => {
  if (visible.length === 0) {
    return (
      <div className="muted-block small">
        No teacher highlights yet. Run <strong>Plan &amp; Analyze</strong>{" "}
        first, then the strongest emphases will appear here.
      </div>
    );
  }

  return (
    <div className="ln-card-grid">
      {visible.map((e, idx) => {
        const srcChip = getSourceChip(e);
        const importance = getImportance(e);
        const impChip = getImportanceChip(importance);
        const transcriptQuote = (e as any).from_transcript_quote || "";
        const loIds: string[] = (e as any).related_lo_ids || [];
        const primaryLoId = loIds[0];
        const loInfo = primaryLoId ? loMap[primaryLoId] : undefined;

        return (
          <article
            key={idx}
            className="ln-card"
            onClick={() => onOpenModal(idx)}
          >
            <div className="ln-card-chip-row">
              <span className={srcChip.className} title={srcChip.tooltip}>
                {srcChip.icon && (
                  <span className="ln-chip-icon">{srcChip.icon}</span>
                )}
                <span className="ln-chip-label">{srcChip.label}</span>
              </span>

              {loInfo && (
                <span className="ln-chip ln-chip--lo">
                  {loInfo.id} – {truncate(loInfo.title, 40)}
                </span>
              )}

              <span className={impChip.className}>{impChip.label}</span>
            </div>

            <h3 className="ln-card-title">
              {e.statement || "Untitled emphasis"}
            </h3>

            {e.why && (
              <p className="ln-card-sub">{truncate(e.why, 180)}</p>
            )}

            {transcriptQuote && (
              <p className="ln-card-quote small">
                "{truncate(transcriptQuote, 120)}"
              </p>
            )}

            <div className="ln-card-footer">
              <button
                type="button"
                className="ln-card-action"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onOpenModal(idx);
                }}
              >
                {t("lecturerNote.viewDetails")}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default EmphasisCardGrid;
