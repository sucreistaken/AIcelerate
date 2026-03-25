import { motion } from "framer-motion";
import type { ChannelFlashcardItem } from "../../../../types";
import { SM2_RATINGS, getSourceTag } from "./constants";
import type { FlashcardMode } from "./constants";

interface FlashcardsReviewProps {
  topic: string;
  mode: FlashcardMode;
  cards: ChannelFlashcardItem[];
  dueCards: ChannelFlashcardItem[];
  reviewIndex: number;
  setReviewIndex: (i: number) => void;
  flipped: boolean;
  setFlipped: (fn: (prev: boolean) => boolean) => void;
  showHint: boolean;
  setShowHint: (v: boolean) => void;
  reviewing: boolean;
  setMode: (m: FlashcardMode) => void;
  handleSm2Rating: (quality: number) => void;
}

export default function FlashcardsReview({
  topic,
  mode,
  cards,
  dueCards,
  reviewIndex,
  setReviewIndex,
  flipped,
  setFlipped,
  showHint,
  setShowHint,
  reviewing,
  setMode,
  handleSm2Rating,
}: FlashcardsReviewProps) {
  const reviewCards = mode === "sm2-review" ? dueCards : cards;

  if (reviewCards.length === 0) {
    return (
      <div className="sh-tool">
        <div className="sh-tool__header sh-fc__header--gradient">
          <div className="sh-tool__header-left">
            <div className="sh-fc__header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </div>
            <h3 className="sh-main-content__channel-name">Flashcards - {topic}</h3>
          </div>
          <div className="sh-tool__header-right">
            <button className="lc-btn lc-btn--ghost lc-btn--sm" onClick={() => setMode("grid")}>
              Kartlara D{"\ö"}n
            </button>
          </div>
        </div>
        <div className="sh-tool__body">
          <div className="sh-tool__empty sh-fc__empty--enhanced">
            <div className="sh-fc__empty-illustration">
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <circle cx="36" cy="36" r="28" fill="none" stroke="var(--accent-2)" strokeWidth="3" opacity="0.2" />
                <circle cx="36" cy="36" r="28" fill="none" stroke="var(--accent-2)" strokeWidth="3" strokeDasharray="176" strokeDashoffset="0" strokeLinecap="round" />
                <path d="M26 36L33 43L46 28" stroke="var(--accent-2)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="sh-tool__empty-title" style={{ fontSize: "var(--text-lg)", marginTop: "var(--space-3)" }}>
              T{"\ü"}m kartlar tekrarland{"\ı"}!
            </h3>
            <p className="sh-tool__empty-desc" style={{ maxWidth: 320 }}>
              Bug{"\ü"}n i{"\ç"}in tekrarlanacak kart kalmad{"\ı"}. Yar{"\ı"}n tekrar gel!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const safeIndex = Math.min(reviewIndex, reviewCards.length - 1);
  const reviewCard = reviewCards[safeIndex];

  return (
    <div className="sh-tool">
      <div className="sh-tool__header sh-fc__header--gradient">
        <div className="sh-tool__header-left">
          <div className="sh-fc__header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <h3 className="sh-main-content__channel-name">
            {mode === "sm2-review" ? "Tekrar Modu" : "G\özden Ge\çir"} - {topic}
          </h3>
          <span className="sh-fc__counter-pill">
            {safeIndex + 1} / {reviewCards.length}
          </span>
        </div>
        <div className="sh-tool__header-right">
          <button
            className="lc-btn lc-btn--ghost lc-btn--sm"
            onClick={() => {
              setMode("grid");
              setFlipped(() => false);
              setShowHint(false);
            }}
          >
            Kartlara D{"\ö"}n
          </button>
        </div>
      </div>

      <div className="sh-tool__body">
        {reviewCard && (
          <div className="sh-fc__review">
            <div className="sh-fc__progress-bar">
              <div
                className="sh-fc__progress-fill"
                style={{ width: `${((safeIndex + 1) / reviewCards.length) * 100}%` }}
              />
            </div>

            <div className="sh-fc__review-perspective">
              <motion.div
                className={`sh-fc__review-card sh-fc__review-card--3d${flipped ? " sh-fc__review-card--flipped" : ""}`}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                style={{ transformStyle: "preserve-3d" }}
                onClick={() => setFlipped((prev) => !prev)}
              >
                {flipped ? (
                  <div className="sh-fc__review-back">
                    <span className="sh-fc__review-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px", marginRight: 4 }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                      </svg>
                      Cevap
                    </span>
                    <p>{reviewCard.back}</p>
                  </div>
                ) : (
                  <div className="sh-fc__review-front">
                    <span className="sh-fc__review-label">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px", marginRight: 4 }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <path d="M12 17h.01" />
                      </svg>
                      Soru
                    </span>
                    <p>{reviewCard.front}</p>
                    <div className="sh-fc__flip-cue">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      <span>T{"\ı"}kla ve {"\ç"}evir</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {!flipped && reviewCard.hint && (
              <div className="sh-fc__hint-area">
                {showHint ? (
                  <p className="sh-fc__hint-text">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px", marginRight: 4 }}>
                      <line x1="9" y1="18" x2="15" y2="18" />
                      <line x1="10" y1="22" x2="14" y2="22" />
                      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                    </svg>
                    {reviewCard.hint}
                  </p>
                ) : (
                  <button
                    className="sh-fc__hint-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHint(true);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="9" y1="18" x2="15" y2="18" />
                      <line x1="10" y1="22" x2="14" y2="22" />
                      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                    </svg>
                    {"\İ"}pucu G{"\ö"}ster
                  </button>
                )}
              </div>
            )}

            {!flipped && !reviewCard.hint && (
              <p className="sh-fc__review-hint">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-2px", marginRight: 4 }}>
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Kart{"\ı"} {"\ç"}evirmek i{"\ç"}in t{"\ı"}klay{"\ı"}n
              </p>
            )}

            {flipped && (
              <div className="sh-fc__sm2-ratings">
                <p className="sh-fc__sm2-prompt">Ne kadar hat{"\ı"}rlad{"\ı"}n{"\ı"}z?</p>
                <div className="sh-fc__sm2-buttons sh-fc__sm2-buttons--large">
                  {SM2_RATINGS.map((r) => (
                    <button
                      key={r.quality}
                      className={`sh-fc__sm2-btn sh-fc__sm2-btn--lg sh-fc__sm2-btn--q${r.quality}`}
                      style={{ "--sm2-color": r.color } as React.CSSProperties}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSm2Rating(r.quality);
                      }}
                      disabled={reviewing}
                      title={r.desc}
                    >
                      <span className="sh-fc__sm2-btn-label">{r.label}</span>
                      <span className="sh-fc__sm2-btn-desc">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!flipped && mode === "review" && (
              <div className="sh-fc__review-nav">
                <button
                  className="lc-btn lc-btn--ghost lc-btn--sm"
                  onClick={() => {
                    setReviewIndex(Math.max(0, reviewIndex - 1));
                    setFlipped(() => false);
                    setShowHint(false);
                  }}
                  disabled={safeIndex === 0}
                >
                  {"\Ö"}nceki
                </button>
                <span className="sh-fc__review-progress">
                  {safeIndex + 1} / {reviewCards.length}
                </span>
                <button
                  className="lc-btn lc-btn--primary lc-btn--sm"
                  onClick={() => {
                    setReviewIndex(Math.min(reviewCards.length - 1, reviewIndex + 1));
                    setFlipped(() => false);
                    setShowHint(false);
                  }}
                  disabled={safeIndex === reviewCards.length - 1}
                >
                  Sonraki
                </button>
              </div>
            )}

            {reviewCard.topic && (
              <div className="sh-fc__card-meta sh-fc__card-meta--review">
                <span className="sh-fc__topic-tag">{reviewCard.topic}</span>
                {getSourceTag(reviewCard.source) && reviewCard.source !== "manual" && (
                  <span className="sh-fc__source-tag">{getSourceTag(reviewCard.source)}</span>
                )}
                <span className="sh-fc__meta-author">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 2 }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {reviewCard.createdByNickname}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
