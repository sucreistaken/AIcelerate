import { motion, AnimatePresence } from "framer-motion";

/* ── Thinking Indicator (inline dots, NOT a full message bubble) ── */

export function ThinkingIndicator({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <motion.div
      className="dd__thinking"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="dd__thinking-inner">
        <div className="dd__avatar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div className="dd__thinking-dots">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="dd__dot"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.2, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Scroll To Bottom ── */

export function ScrollToBottomButton({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          className="dd__scroll-btn"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          onClick={onClick}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* ── Saved Toast ── */

export function SavedToast({ savedMsgIdx }: { savedMsgIdx: number | null }) {
  return (
    <AnimatePresence>
      {savedMsgIdx !== null && (
        <motion.div
          className="dd__toast"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Saved to notes
        </motion.div>
      )}
    </AnimatePresence>
  );
}
