import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useFlashcardStore } from "../../stores/flashcardStore";
import { useLessonStore } from "../../stores/lessonStore";
import { getDifficultyFromEF } from "./flashcardUtils";
import { t } from "../../utils/i18n";
import { useUiStore } from "../../stores/uiStore";

function FlashcardBrowseMode() {
  useUiStore((s) => s.language);
  const { cards, fetchAll, deleteCard, loading } = useFlashcardStore();
  const currentLessonId = useLessonStore((s) => s.currentLessonId);
  const [filter, setFilter] = useState<string>("all");
  const [editingCard, setEditingCard] = useState<{ id: string; front: string; back: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const saveCardEdit = useCallback(async () => {
    if (!editingCard) return;
    setEditSaving(true);
    try {
      const { flashcardApi } = await import('../../services/api');
      const res = await flashcardApi.update(editingCard.id, editingCard.front, editingCard.back);
      if (res.ok) {
        toast.success(t('flashcard.cardUpdated'));
        setEditingCard(null);
        fetchAll(currentLessonId || undefined);
      } else {
        toast.error(res.error || t('flashcard.updateFailed'));
      }
    } catch { toast.error(t('flashcard.updateError')); }
    setEditSaving(false);
  }, [editingCard, fetchAll, currentLessonId]);

  const handleDelete = useCallback((cardId: string) => {
    // Delete immediately
    deleteCard(cardId);
    toast.success(t('flashcard.cardDeleted'), { duration: 2000 });
  }, [deleteCard]);

  useEffect(() => {
    fetchAll(currentLessonId || undefined);
  }, [currentLessonId]);

  const filtered = filter === "all" ? cards : cards.filter((c) => c.state === filter);

  const stateStyle: Record<string, string> = {
    new: "status-badge--info",
    learning: "status-badge--warning",
    review: "status-badge--info",
    graduated: "status-badge--success",
  };

  return (
    <div>
      <div className="view-toggle" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {["all", "new", "learning", "review", "graduated"].map((f) => {
          const labelMap: Record<string, string> = {
            all: t('flashcard.filterAll'),
            new: t('flashcard.statNew'),
            learning: t('flashcard.statLearning'),
            review: t('flashcard.statReview'),
            graduated: t('flashcard.statGraduated'),
          };
          return (
            <button
              key={f}
              className={`view-toggle__btn${filter === f ? " view-toggle__btn--active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {labelMap[f]}
              {f !== "all" ? ` (${cards.filter((c) => c.state === f).length})` : ""}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="pane-empty" style={{ padding: 24 }}>
          <div className="pane-empty__desc">{t('flashcard.loadingCards')}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pane-empty">
          <div className="pane-empty__icon">F</div>
          <div className="pane-empty__title">{t('flashcard.noCardsFound')}</div>
          <div className="pane-empty__desc">
            {t('flashcard.generateFromLesson')}
          </div>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.04 } },
          }}
          style={{ display: "grid", gap: 8 }}
        >
          {filtered.map((card) => (
            <motion.div
              key={card.id}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
              }}
            >
              <div className="fc-browse-card">
                <div className="fc-browse-header">
                  <span className={`status-badge ${stateStyle[card.state] || "status-badge--muted"}`}>
                    {({new: t('flashcard.statNew'), learning: t('flashcard.statLearning'), review: t('flashcard.statReview'), graduated: t('flashcard.statGraduated')} as Record<string, string>)[card.state] || card.state}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="fc-delete-btn" style={{ color: 'var(--accent-2)' }}
                      onClick={() => setEditingCard({ id: card.id, front: card.front, back: card.back })}>
                      {t('flashcard.edit')}
                    </button>
                    <button className="fc-delete-btn" onClick={() => handleDelete(card.id)}>
                      {t('flashcard.delete')}
                    </button>
                  </div>
                </div>
                {editingCard?.id === card.id ? (
                  <div style={{ display: 'grid', gap: 8, padding: '8px 0' }}>
                    <input
                      style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13 }}
                      value={editingCard.front}
                      onChange={e => setEditingCard({ ...editingCard, front: e.target.value })}
                      placeholder={t('flashcard.front')}
                    />
                    <textarea
                      style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, resize: 'vertical' }}
                      value={editingCard.back}
                      onChange={e => setEditingCard({ ...editingCard, back: e.target.value })}
                      rows={3}
                      placeholder={t('flashcard.back')}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={saveCardEdit} disabled={editSaving}>
                        {editSaving ? '...' : t('flashcard.save')}
                      </button>
                      <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setEditingCard(null)}>
                        {t('flashcard.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="fc-browse-front">{card.front}</div>
                    <div className="fc-browse-back">{card.back}</div>
                  </>
                )}
                <div className="fc-browse-meta">
                  <span>{card.topicName}</span>
                  <span className="fc-card__meta-sep" />
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                    background: getDifficultyFromEF(card.easeFactor).bg,
                    color: getDifficultyFromEF(card.easeFactor).color,
                  }}>
                    {getDifficultyFromEF(card.easeFactor).label}
                  </span>
                  <span className="fc-card__meta-sep" />
                  <span>{t('flashcard.interval')}: {card.interval}d</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default React.memo(FlashcardBrowseMode);
