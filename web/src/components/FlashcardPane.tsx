import { motion, AnimatePresence } from "framer-motion";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { FlashcardReviewMode, FlashcardBrowseMode, FlashcardStats } from "./flashcard";
import { useFlashcardPane } from "../hooks/useFlashcardPane";
import { t } from "../utils/i18n";

export default function FlashcardPane() {
  const { stats, viewMode, setViewMode, loading, currentLessonId, handleGenerate } = useFlashcardPane();

  return (
    <motion.div
      className="grid-gap-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <section className="lc-section">
        <PaneInfoBanner
          id="flashcards"
          title={t("flashcard.title")}
          description={t("flashcard.desc")}
          tips={[t("flashcard.tips1"), t("flashcard.tips2"), t("flashcard.tips3"), t("flashcard.tips4")]}
        />
        <div className="pane-header" style={{ marginBottom: 14 }}>
          <div className="pane-header__info">
            <div className="pane-header__title">{t("flashcard.pageTitle")}</div>
            <div className="pane-header__desc">
              {t("flashcard.pageDesc")}
            </div>
          </div>
          <div className="pane-header__actions">
            {currentLessonId && (
              <motion.button
                className="btn"
                onClick={handleGenerate}
                disabled={loading}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                {loading ? t("flashcard.generating") : t("flashcard.generateCards")}
              </motion.button>
            )}
          </div>
        </div>

        {stats && <FlashcardStats stats={stats} />}

        <div className="view-toggle">
          <button
            className={`view-toggle__btn${viewMode === "review" ? " view-toggle__btn--active" : ""}`}
            onClick={() => setViewMode("review")}
          >
            {t("flashcard.reviewMode")}
          </button>
          <button
            className={`view-toggle__btn${viewMode === "browse" ? " view-toggle__btn--active" : ""}`}
            onClick={() => setViewMode("browse")}
          >
            {t("flashcard.browseAll")}
          </button>
        </div>
      </section>

      <section className="lc-section">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, x: viewMode === "review" ? -16 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: viewMode === "review" ? 16 : -16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {viewMode === "review" ? <FlashcardReviewMode /> : <FlashcardBrowseMode />}
          </motion.div>
        </AnimatePresence>
      </section>
    </motion.div>
  );
}
