import React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  selected, loMap, openSelfCheckIdx, setOpenSelfCheckIdx,
  onClose, onPrev, onNext,
}) => {
  const srcChip = getSourceChip(selected);
  const importance = getImportance(selected);
  const impChip = getImportanceChip(importance);
  const loIds: string[] = (selected as any).related_lo_ids || [];
  const loLabels = loIds
    .map((id) => (loMap[id] ? `${id} - ${loMap[id].title}` : id))
    .join(", ");

  const selfCheckItems = [
    { q: "Bu fikri 1-2 cumleyle kendi sozlerinizle aciklayabilir misiniz?", a: selected.statement || "Kendi sozlerinizle ozetleyin." },
    { q: "Dersten hangi ornek bu noktayi en iyi acikliyor?", a: (selected as any).from_transcript_quote || "Hocadan somut bir ornek hatirlyin." },
    { q: "Bu konu sinavda hangi LO altinda cikar?", a: loLabels || "En uygun LO ile eslestirin." },
  ];

  return (
    <div className="ln__modal-backdrop" onClick={onClose}>
      <motion.div
        className="ln__modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Header */}
        <header className="ln__modal-header">
          <div className="ln__modal-chips">
            <span className={srcChip.className}>
              {srcChip.icon && <span className="ln-chip-icon">{srcChip.icon}</span>}
              <span className="ln-chip-label">{srcChip.label}</span>
            </span>
            {loIds.length > 0 && <span className="ln-chip ln-chip--lo">{loLabels}</span>}
            <span className={impChip.className}>{impChip.label}</span>
          </div>
          <button type="button" className="ln__modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        {/* Body */}
        <main className="ln__modal-body">
          <section className="ln__modal-section">
            <h3 className="ln__modal-section-title">Temel Fikir</h3>
            <p className="ln__modal-core">{selected.statement || "Untitled emphasis"}</p>
          </section>

          {selected.why && (
            <section className="ln__modal-section">
              <h3 className="ln__modal-section-title">Neden Onemli</h3>
              <p className="ln__modal-text">{selected.why}</p>
            </section>
          )}

          {((selected as any).from_transcript_quote || (selected as any).from_slide_quote) && (
            <section className="ln__modal-section ln__modal-quotes">
              <div className="ln__quote-block">
                <div className="ln__quote-label">Dersten</div>
                <blockquote className="ln__quote">{(selected as any).from_transcript_quote || "—"}</blockquote>
              </div>
              <div className="ln__quote-block">
                <div className="ln__quote-label">Slayttan</div>
                <blockquote className="ln__quote ln__quote--slide">{(selected as any).from_slide_quote || "—"}</blockquote>
              </div>
            </section>
          )}

          <section className="ln__modal-section">
            <h3 className="ln__modal-section-title">Hizli Kendin Kontrol Et</h3>
            <div className="ln__selfcheck-list">
              {selfCheckItems.map((item, idx) => (
                <div key={idx} className="ln__selfcheck-item">
                  <button
                    type="button"
                    className={`ln__selfcheck-q${openSelfCheckIdx === idx ? " ln__selfcheck-q--open" : ""}`}
                    onClick={() => setOpenSelfCheckIdx(openSelfCheckIdx === idx ? null : idx)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points={openSelfCheckIdx === idx ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
                    </svg>
                    {item.q}
                  </button>
                  <AnimatePresence>
                    {openSelfCheckIdx === idx && (
                      <motion.p
                        className="ln__selfcheck-a"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.a}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="ln__modal-footer">
          <button type="button" className="ln__nav-btn" onClick={onPrev}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Onceki
          </button>
          <button type="button" className="ln__nav-btn" onClick={onNext}>
            Sonraki
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </footer>
      </motion.div>
    </div>
  );
};

export default EmphasisDetailModal;
