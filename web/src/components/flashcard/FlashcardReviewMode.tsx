import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFlashcardStore } from "../../stores/flashcardStore";
import { useGamificationStore } from "../../stores/gamificationStore";
import { getDifficultyFromEF } from "./flashcardUtils";
import { t } from "../../utils/i18n";

function FlashcardReviewMode() {
  const { dueCards, currentIndex, isFlipped, setFlipped, review, fetchDue } = useFlashcardStore();
  const card = dueCards[currentIndex];
  const [sessionStart] = useState(() => Date.now());
  const [reviewedQualities, setReviewedQualities] = useState<number[]>([]);
  const [sessionDone, setSessionDone] = useState(false);

  useEffect(() => {
    fetchDue();
    setSessionDone(false);
    setReviewedQualities([]);
  }, []);

  useEffect(() => {
    if (dueCards.length > 0 && currentIndex >= dueCards.length && !sessionDone) {
      setSessionDone(true);
    }
  }, [currentIndex, dueCards.length, sessionDone]);

  const handleReview = useCallback((cardId: string, q: number) => {
    setReviewedQualities(prev => [...prev, q]);
    review(cardId, q);
    useGamificationStore.getState().addXp('flashcard-review');
  }, [review]);

  if (sessionDone && reviewedQualities.length > 0) {
    const elapsed = Math.round((Date.now() - sessionStart) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const avgQ = (reviewedQualities.reduce((a, b) => a + b, 0) / reviewedQualities.length).toFixed(1);
    const needRepeat = reviewedQualities.filter(q => q <= 2).length;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center', padding: 24 }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>&#10003;</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{t("flashcard.sessionDone")}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 300, margin: '0 auto 20px' }}>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--input-bg)' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{reviewedQualities.length}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t("flashcard.cards")}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--input-bg)' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{mins}:{String(secs).padStart(2, '0')}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t("flashcard.time")}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--input-bg)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: Number(avgQ) >= 3 ? '#00b894' : '#fdcb6e' }}>{avgQ}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t("flashcard.avgQuality")}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--input-bg)' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: needRepeat > 0 ? '#e17055' : '#00b894' }}>{needRepeat}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t("flashcard.needRepeat")}</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setSessionDone(false); setReviewedQualities([]); fetchDue(); }}>
          {t("flashcard.newSession")}
        </button>
      </motion.div>
    );
  }

  if (!dueCards.length) {
    return (
      <div className="pane-empty">
        <motion.div
          className="pane-empty__icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
        >
          &#10003;
        </motion.div>
        <div className="pane-empty__title">{t("flashcard.allCaughtUp")}</div>
        <div className="pane-empty__desc">
          {t("flashcard.noDueCards")}
        </div>
      </div>
    );
  }

  if (!card) return null;

  const qualityButtons = [
    { q: 1, label: t("flashcard.again"), color: "var(--danger)", dataQ: "again" },
    { q: 2, label: t("flashcard.hard"), color: "var(--warning)", dataQ: "hard" },
    { q: 3, label: t("flashcard.good"), color: "var(--accent-2)", dataQ: "good" },
    { q: 5, label: t("flashcard.easy"), color: "var(--success)", dataQ: "easy" },
  ];

  const progressPct = ((currentIndex + 1) / dueCards.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="fc-progress-label">
        <span className="small" style={{ color: "var(--muted)" }}>
          Card {currentIndex + 1} of {dueCards.length}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="small" style={{ color: "var(--muted)" }}>
            {card.topicName}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
            background: getDifficultyFromEF(card.easeFactor).bg,
            color: getDifficultyFromEF(card.easeFactor).color,
          }}>
            {getDifficultyFromEF(card.easeFactor).label}
          </span>
        </span>
      </div>
      <div className="fc-progress-track">
        <motion.div
          className="fc-progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <div className="fc-card-wrapper" onClick={() => setFlipped(!isFlipped)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={isFlipped ? "back" : "front"}
            initial={{ rotateY: 90, opacity: 0, scale: 0.95 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            exit={{ rotateY: -90, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`fc-card${isFlipped ? " fc-card--back" : ""}`}
          >
            <div className="fc-card__label">
              {isFlipped ? "ANSWER" : "QUESTION"} — tap to flip
            </div>
            <div className="fc-card__content">
              {isFlipped ? card.back : card.front}
            </div>
            <div className="fc-card__meta">
              <span>{card.source}</span>
              <span className="fc-card__meta-sep" />
              <span>{card.state}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fc-quality-group"
          >
            {qualityButtons.map(({ q, label, color, dataQ }, i) => (
              <motion.button
                key={q}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="fc-quality-btn"
                data-quality={dataQ}
                style={{ background: color }}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.95, y: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReview(card.id, q);
                }}
              >
                {label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default React.memo(FlashcardReviewMode);
