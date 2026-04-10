import React from "react";
import { motion } from "framer-motion";
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
      <div className="ln__empty">
        <div className="ln__empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <p className="ln__empty-text">
          {t("lecturerNote.noEmphases") || "Henuz vurgu yok. Once Plan & Analiz calistirin."}
        </p>
      </div>
    );
  }

  return (
    <div className="ln__card-grid">
      {visible.map((e, idx) => {
        const srcChip = getSourceChip(e);
        const importance = getImportance(e);
        const impChip = getImportanceChip(importance);
        const transcriptQuote = (e as any).from_transcript_quote || "";
        const loIds: string[] = (e as any).related_lo_ids || [];
        const primaryLoId = loIds[0];
        const loInfo = primaryLoId ? loMap[primaryLoId] : undefined;

        return (
          <motion.article
            key={idx}
            className="ln__card"
            onClick={() => onOpenModal(idx)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.04 + idx * 0.03 }}
            whileHover={{ y: -2 }}
          >
            <div className="ln__card-chips">
              <span className={srcChip.className} title={srcChip.tooltip}>
                {srcChip.icon && <span className="ln-chip-icon">{srcChip.icon}</span>}
                <span className="ln-chip-label">{srcChip.label}</span>
              </span>
              {loInfo && (
                <span className="ln-chip ln-chip--lo">
                  {loInfo.id} - {truncate(loInfo.title, 30)}
                </span>
              )}
              <span className={impChip.className}>{impChip.label}</span>
            </div>

            <h3 className="ln__card-title">{e.statement || "Untitled emphasis"}</h3>

            {e.why && <p className="ln__card-why">{truncate(e.why, 160)}</p>}

            {transcriptQuote && (
              <blockquote className="ln__card-quote">
                "{truncate(transcriptQuote, 100)}"
              </blockquote>
            )}

            <div className="ln__card-footer">
              <button
                type="button"
                className="ln__card-action"
                onClick={(ev) => { ev.stopPropagation(); onOpenModal(idx); }}
              >
                {t("lecturerNote.viewDetails")}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
};

export default EmphasisCardGrid;
