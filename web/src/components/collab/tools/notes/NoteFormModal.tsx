import { motion, AnimatePresence } from "framer-motion";
import { CATEGORIES, type NoteCategory } from "./constants";

interface Props {
  showForm: boolean;
  formTitle: string;
  formContent: string;
  formCategory: NoteCategory;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onTitleChange: (val: string) => void;
  onContentChange: (val: string) => void;
  onCategoryChange: (val: NoteCategory) => void;
}

export default function NoteFormModal({
  showForm,
  formTitle,
  formContent,
  formCategory,
  submitting,
  onClose,
  onSubmit,
  onTitleChange,
  onContentChange,
  onCategoryChange,
}: Props) {
  return (
    <AnimatePresence>
      {showForm && (
        <motion.div
          className="sh-notes__overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="sh-notes__modal"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sh-notes__modal-header">
              <h3 className="sh-notes__modal-title">Yeni Not</h3>
              <button
                className="sh-notes__modal-close"
                onClick={onClose}
                type="button"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <form className="sh-notes__modal-form" onSubmit={onSubmit}>
              <div className="sh-notes__form-group">
                <label className="sh-notes__form-label">Ba{"\ş"}l{"\ı"}k</label>
                <input
                  className="sh-notes__form-input"
                  type="text"
                  placeholder="Not ba\şl\ı\ğ\ı..."
                  value={formTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="sh-notes__form-group">
                <label className="sh-notes__form-label">{"\İ"}{"\ç"}erik</label>
                <textarea
                  className="sh-notes__form-textarea"
                  placeholder="Not i\çeri\ği..."
                  value={formContent}
                  onChange={(e) => onContentChange(e.target.value)}
                  rows={5}
                  required
                />
              </div>
              <div className="sh-notes__form-group">
                <label className="sh-notes__form-label">Kategori</label>
                <div className="sh-notes__category-picker">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`sh-notes__category-option sh-notes__category-option--${c.value}${formCategory === c.value ? " sh-notes__category-option--selected" : ""}`}
                      onClick={() => onCategoryChange(c.value)}
                    >
                      <span className="sh-notes__category-option-icon">{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="sh-notes__modal-actions">
                <button
                  type="button"
                  className="sh-notes__modal-btn sh-notes__modal-btn--ghost"
                  onClick={onClose}
                >
                  {"\İ"}ptal
                </button>
                <button
                  type="submit"
                  className="sh-notes__modal-btn sh-notes__modal-btn--primary"
                  disabled={submitting}
                >
                  {submitting ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
