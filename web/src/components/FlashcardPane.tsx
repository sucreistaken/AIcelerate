import { motion, AnimatePresence } from "framer-motion";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { FlashcardReviewMode, FlashcardBrowseMode, FlashcardStats } from "./flashcard";
import { useFlashcardPane } from "../hooks/useFlashcardPane";
import { t } from "../utils/i18n";

export default function FlashcardPane() {
  const { stats, viewMode, setViewMode, loading, currentLessonId, handleGenerate } = useFlashcardPane();

  return (
    <motion.div
      className="fcp"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <PaneInfoBanner
        id="flashcards"
        title={t("flashcard.title")}
        description={t("flashcard.desc")}
        tips={[t("flashcard.tips1"), t("flashcard.tips2"), t("flashcard.tips3"), t("flashcard.tips4")]}
      />

      <motion.header
        className="fcp__header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="fcp__header-left">
          <div className="fcp__header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <div>
            <h1 className="fcp__title">{t("flashcard.pageTitle")}</h1>
            <p className="fcp__desc">{t("flashcard.pageDesc")}</p>
          </div>
        </div>
        <div className="fcp__header-actions">
          {currentLessonId && (
            <motion.button
              className="fcp__generate-btn"
              onClick={handleGenerate}
              disabled={loading}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? (
                <><svg className="fcp__spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> {t("flashcard.generating")}</>
              ) : (
                t("flashcard.generateCards")
              )}
            </motion.button>
          )}
        </div>
      </motion.header>

      {stats && <FlashcardStats stats={stats} />}

      <div className="fcp__mode-toggle">
        <button
          className={`fcp__mode-btn${viewMode === "review" ? " fcp__mode-btn--active" : ""}`}
          onClick={() => setViewMode("review")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {t("flashcard.reviewMode")}
        </button>
        <button
          className={`fcp__mode-btn${viewMode === "browse" ? " fcp__mode-btn--active" : ""}`}
          onClick={() => setViewMode("browse")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          {t("flashcard.browseAll")}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, x: viewMode === "review" ? -16 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: viewMode === "review" ? 16 : -16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {viewMode === "review" ? <FlashcardReviewMode /> : <FlashcardBrowseMode />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
