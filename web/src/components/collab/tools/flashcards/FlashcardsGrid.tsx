import { motion } from "framer-motion";
import type { ChannelFlashcardItem, ExtractionSummary } from "../../../../types";
import StatRing from "./StatRing";
import { isDueForReview, getDaysUntilReview, getSourceTag, getVoteScore, getUserVote } from "./constants";
import type { FlashcardMode } from "./constants";

interface FlashcardsGridProps {
  topic: string;
  userId: string;
  cards: ChannelFlashcardItem[];
  dueCards: ChannelFlashcardItem[];
  hasLesson: boolean;
  generating: boolean;
  extracting: boolean;
  showAddForm: boolean;
  setShowAddForm: (fn: boolean | ((prev: boolean) => boolean)) => void;
  front: string;
  setFront: (v: string) => void;
  back: string;
  setBack: (v: string) => void;
  cardTopic: string;
  setCardTopic: (v: string) => void;
  revealedCards: Set<string>;
  extractionResult: ExtractionSummary | null;
  setExtractionResult: (v: ExtractionSummary | null) => void;
  totalCards: number;
  duePercent: number;
  reviewedCount: number;
  reviewedPercent: number;
  masteredCount: number;
  masteredPercent: number;
  toggleReveal: (cardId: string) => void;
  handleVote: (card: ChannelFlashcardItem, vote: "up" | "down") => void;
  handleAddCard: (e: React.FormEvent) => void;
  handleGenerate: () => void;
  handleExtract: () => void;
  startReview: (mode: FlashcardMode) => void;
}

export default function FlashcardsGrid({
  topic,
  userId,
  cards,
  dueCards,
  hasLesson,
  generating,
  extracting,
  showAddForm,
  setShowAddForm,
  front,
  setFront,
  back,
  setBack,
  cardTopic,
  setCardTopic,
  revealedCards,
  extractionResult,
  setExtractionResult,
  totalCards,
  duePercent,
  reviewedCount,
  reviewedPercent,
  masteredCount,
  masteredPercent,
  toggleReveal,
  handleVote,
  handleAddCard,
  handleGenerate,
  handleExtract,
  startReview,
}: FlashcardsGridProps) {
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
          <span className="sh-fc__counter-pill">{cards.length} kart</span>
        </div>
        <div className="sh-tool__header-right">
          {dueCards.length > 0 && (
            <button
              className="sh-fc__action-btn sh-fc__action-btn--review"
              onClick={() => startReview("sm2-review")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Tekrar ({dueCards.length})
            </button>
          )}
          <button
            className="lc-btn lc-btn--ghost lc-btn--sm"
            onClick={() => startReview("review")}
          >
            G{"\ö"}zden Ge{"\ç"}ir
          </button>
          <button
            className="sh-fc__action-btn sh-fc__action-btn--generate"
            onClick={handleGenerate}
            disabled={generating}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            {generating ? "Olu\şturuluyor..." : "AI ile Olu\ştur"}
          </button>
          {hasLesson && (
            <button
              className="sh-fc__action-btn sh-fc__action-btn--extract"
              onClick={handleExtract}
              disabled={extracting}
              title="Ders materyalinden direkt kart cikar (AI kullanmaz)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {extracting ? "\Ç\ıkar\ıl\ıyor..." : "Dersten \Ç\ıkar"}
            </button>
          )}
          <button
            className="lc-btn lc-btn--ghost lc-btn--sm"
            onClick={() => setShowAddForm((prev: boolean) => !prev)}
          >
            {showAddForm ? "Kapat" : "+ Kart Ekle"}
          </button>
        </div>
      </div>

      <div className="sh-tool__body">
        {extractionResult && (
          <div className="sh-fc__extraction-banner sh-fc__extraction-banner--enhanced">
            <div className="sh-fc__extraction-banner-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <polyline points="16 13 12 17 8 13" />
                <line x1="12" y1="9" x2="12" y2="17" />
              </svg>
            </div>
            <div className="sh-fc__extraction-banner-content">
              {extractionResult.total > 0 ? (
                <>
                  <strong>{extractionResult.total} kart {"\ç"}{"\ı"}kar{"\ı"}ld{"\ı"}</strong>
                  <span className="sh-fc__extraction-banner-details">
                    {extractionResult.emphases > 0 && (
                      <span className="sh-fc__extraction-chip">{extractionResult.emphases} vurgu</span>
                    )}
                    {extractionResult.quickQuiz > 0 && (
                      <span className="sh-fc__extraction-chip">{extractionResult.quickQuiz} cheat sheet</span>
                    )}
                    {extractionResult.miniQuiz > 0 && (
                      <span className="sh-fc__extraction-chip">{extractionResult.miniQuiz} mini quiz</span>
                    )}
                    {extractionResult.mustRemember > 0 && (
                      <span className="sh-fc__extraction-chip">{extractionResult.mustRemember} anahtar bilgi</span>
                    )}
                  </span>
                </>
              ) : (
                <span>T{"\ü"}m kartlar zaten mevcut, yeni kart eklenmedi.</span>
              )}
            </div>
            <button className="sh-fc__extraction-banner-close" onClick={() => setExtractionResult(null)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <div className="sh-fc__stats sh-fc__stats--cards">
          <div className="sh-fc__stat-card">
            <StatRing percent={100} color="var(--accent-2)" />
            <div className="sh-fc__stat-info">
              <span className="sh-fc__stat-value">{totalCards}</span>
              <span className="sh-fc__stat-label">Toplam</span>
            </div>
          </div>
          <div className="sh-fc__stat-card sh-fc__stat-card--due">
            <StatRing percent={duePercent} color="var(--danger)" />
            <div className="sh-fc__stat-info">
              <span className="sh-fc__stat-value" style={{ color: dueCards.length > 0 ? "var(--danger)" : undefined }}>
                {dueCards.length}
              </span>
              <span className="sh-fc__stat-label">Tekrar Bekliyor</span>
            </div>
          </div>
          <div className="sh-fc__stat-card sh-fc__stat-card--done">
            <StatRing percent={reviewedPercent} color="#27ae60" />
            <div className="sh-fc__stat-info">
              <span className="sh-fc__stat-value">{reviewedCount}</span>
              <span className="sh-fc__stat-label">Tekrarland{"\ı"}</span>
            </div>
          </div>
          <div className="sh-fc__stat-card sh-fc__stat-card--mastered">
            <StatRing percent={masteredPercent} color="var(--accent-2)" />
            <div className="sh-fc__stat-info">
              <span className="sh-fc__stat-value">{masteredCount}</span>
              <span className="sh-fc__stat-label">G{"\ü"}ncel</span>
            </div>
          </div>
        </div>

        {showAddForm && (
          <form className="sh-fc__add-form sh-fc__add-form--polished" onSubmit={handleAddCard}>
            <div className="sh-fc__add-form-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Yeni Kart Ekle</span>
            </div>
            <input
              className="lc-input"
              type="text"
              placeholder={"\Ön Y\üz (soru)"}
              value={front}
              onChange={(e) => setFront(e.target.value)}
              required
            />
            <textarea
              className="lc-textarea"
              placeholder={"Arka Y\üz (cevap)"}
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              required
            />
            <input
              className="lc-input"
              type="text"
              placeholder="Konu"
              value={cardTopic}
              onChange={(e) => setCardTopic(e.target.value)}
            />
            <div className="sh-fc__add-form-actions">
              <button type="button" className="lc-btn lc-btn--ghost lc-btn--sm" onClick={() => setShowAddForm(false)}>
                {"\İ"}ptal
              </button>
              <button type="submit" className="lc-btn lc-btn--primary lc-btn--sm">
                Ekle
              </button>
            </div>
          </form>
        )}

        <div className="sh-fc__grid sh-fc__grid--large">
          {cards.map((card) => {
            const isRevealed = revealedCards.has(card.id);
            const voteScore = getVoteScore(card);
            const userVote = getUserVote(card, userId);
            const isDue = isDueForReview(card, userId);
            const daysUntil = getDaysUntilReview(card, userId);
            const sourceTag = getSourceTag(card.source);

            return (
              <motion.div
                key={card.id}
                className={`sh-fc__card sh-fc__card--enhanced${isRevealed ? " sh-fc__card--revealed" : ""}${isDue ? " sh-fc__card--due" : ""}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => toggleReveal(card.id)}
              >
                {sourceTag && card.source !== "manual" && (
                  <span className={`sh-fc__source-tag sh-fc__source-tag--${card.source}`}>
                    {card.source === "ai-generated" && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 2 }}>
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    )}
                    {sourceTag}
                  </span>
                )}

                <div className="sh-fc__card-flip-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </div>

                <div className="sh-fc__card-front">
                  <p>{card.front}</p>
                </div>

                {isRevealed && (
                  <div className="sh-fc__card-back">
                    <p>{card.back}</p>
                    {card.hint && (
                      <p className="sh-fc__card-hint">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 3 }}>
                          <line x1="9" y1="18" x2="15" y2="18" />
                          <line x1="10" y1="22" x2="14" y2="22" />
                          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                        </svg>
                        {card.hint}
                      </p>
                    )}
                  </div>
                )}

                <div className="sh-fc__card-meta">
                  <span className="sh-fc__meta-author">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-1px", marginRight: 2 }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {card.createdByNickname}
                  </span>
                  <div className="sh-fc__card-meta-right">
                    {card.topic && <span className="sh-fc__topic-tag">{card.topic}</span>}
                    {daysUntil !== null && (
                      <span className={`sh-fc__due-badge${isDue ? " sh-fc__due-badge--now" : ""}`}>
                        {isDue ? "Tekrar!" : `${daysUntil}g`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="sh-fc__card-votes" onClick={(e) => e.stopPropagation()}>
                  <button
                    className={`sh-fc__vote-btn${userVote === "up" ? " sh-fc__vote-btn--active" : ""}`}
                    onClick={() => handleVote(card, "up")}
                  >
                    {"\▲"}
                  </button>
                  <span className="sh-fc__vote-score">{voteScore}</span>
                  <button
                    className={`sh-fc__vote-btn${userVote === "down" ? " sh-fc__vote-btn--active" : ""}`}
                    onClick={() => handleVote(card, "down")}
                  >
                    {"\▼"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
