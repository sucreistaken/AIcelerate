import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useFlashcardStore } from "../../stores/flashcardStore";
import { useLessonStore } from "../../stores/lessonStore";
import { getDifficultyFromEF } from "./flashcardUtils";

function FlashcardBrowseMode() {
  const { cards, fetchAll, deleteCard, loading } = useFlashcardStore();
  const currentLessonId = useLessonStore((s) => s.currentLessonId);
  const [filter, setFilter] = useState<string>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<{ id: string; front: string; back: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const saveCardEdit = useCallback(async () => {
    if (!editingCard) return;
    setEditSaving(true);
    try {
      const { flashcardApi } = await import('../../services/api');
      const res = await flashcardApi.update(editingCard.id, editingCard.front, editingCard.back);
      if (res.ok) {
        toast.success("Kart guncellendi");
        setEditingCard(null);
        fetchAll(currentLessonId || undefined);
      } else {
        toast.error(res.error || "Guncelleme basarisiz");
      }
    } catch { toast.error("Guncelleme hatasi"); }
    setEditSaving(false);
  }, [editingCard, fetchAll, currentLessonId]);

  const handleDelete = useCallback((cardId: string) => {
    setPendingDeleteId(cardId);
    const toastId = toast((t) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span>Kart silindi.</span>
        <button
          style={{ background: "var(--accent-2)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          onClick={() => { toast.dismiss(t.id); setPendingDeleteId(null); }}
        >
          Geri Al
        </button>
      </div>
    ), { duration: 5000 });

    setTimeout(() => {
      setPendingDeleteId((current) => {
        if (current === cardId) {
          deleteCard(cardId);
          return null;
        }
        return current;
      });
    }, 5000);
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
        {["all", "new", "learning", "review", "graduated"].map((f) => (
          <button
            key={f}
            className={`view-toggle__btn${filter === f ? " view-toggle__btn--active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" ? ` (${cards.filter((c) => c.state === f).length})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="pane-empty" style={{ padding: 24 }}>
          <div className="pane-empty__desc">Loading cards...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pane-empty">
          <div className="pane-empty__icon">F</div>
          <div className="pane-empty__title">No cards found</div>
          <div className="pane-empty__desc">
            Generate flashcards from a lesson first.
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
                    {card.state}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="fc-delete-btn" style={{ color: 'var(--accent-2)' }}
                      onClick={() => setEditingCard({ id: card.id, front: card.front, back: card.back })}>
                      Edit
                    </button>
                    <button className="fc-delete-btn" onClick={() => handleDelete(card.id)}
                      disabled={pendingDeleteId === card.id}>
                      {pendingDeleteId === card.id ? "Siliniyor..." : "Delete"}
                    </button>
                  </div>
                </div>
                {editingCard?.id === card.id ? (
                  <div style={{ display: 'grid', gap: 8, padding: '8px 0' }}>
                    <input
                      style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13 }}
                      value={editingCard.front}
                      onChange={e => setEditingCard({ ...editingCard, front: e.target.value })}
                      placeholder="Front"
                    />
                    <textarea
                      style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, resize: 'vertical' }}
                      value={editingCard.back}
                      onChange={e => setEditingCard({ ...editingCard, back: e.target.value })}
                      rows={3}
                      placeholder="Back"
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={saveCardEdit} disabled={editSaving}>
                        {editSaving ? '...' : 'Kaydet'}
                      </button>
                      <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setEditingCard(null)}>
                        Iptal
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
                  <span>Interval: {card.interval}d</span>
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
