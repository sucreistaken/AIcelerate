import { motion, AnimatePresence } from "framer-motion";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { FlashcardReviewMode, FlashcardBrowseMode, FlashcardStats } from "./flashcard";
import { useFlashcardPane } from "../hooks/useFlashcardPane";

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
          title="Flashcards Nasil Calisir?"
          description="SM-2 algoritmasi ile tekrarli ogrenme kartlari. Review modunda kartlari cevirip kalite puani verin: Again (unutuldu), Hard (zor hatirlandi), Good (hatirladi), Easy (cok kolay). Sistem zorlandiginiz kartlari daha sik, kolaylari daha seyrek gosterir."
          tips={["Again: Yarin tekrar", "Hard: 2-3 gun sonra", "Good: Normal aralik", "Easy: Uzun aralik"]}
        />
        <div className="pane-header" style={{ marginBottom: 14 }}>
          <div className="pane-header__info">
            <div className="pane-header__title">Flashcards</div>
            <div className="pane-header__desc">
              Spaced repetition powered by SM-2 algorithm.
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
                {loading ? "Generating..." : "Generate Cards"}
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
            Review Mode
          </button>
          <button
            className={`view-toggle__btn${viewMode === "browse" ? " view-toggle__btn--active" : ""}`}
            onClick={() => setViewMode("browse")}
          >
            Browse All
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
