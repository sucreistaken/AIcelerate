import { motion, AnimatePresence } from "framer-motion";

interface ThinkingIndicatorProps {
  loading: boolean;
}

export function ThinkingIndicator({ loading }: ThinkingIndicatorProps) {
  if (!loading) return null;
  return (
    <motion.div
      className="dd-msg-row"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="dd-msg-inner">
        <div className="dd-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div className="dd-msg-body">
          <div className="dd-msg-role">LearnCraft AI</div>
          <div className="dd-thinking-dots">
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                className="dd-dot"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
}

export function ScrollToBottomButton({ show, onClick }: ScrollToBottomButtonProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          className="dd-scroll-btn"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={onClick}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

interface SavedToastProps {
  savedMsgIdx: number | null;
}

export function SavedToast({ savedMsgIdx }: SavedToastProps) {
  return (
    <AnimatePresence>
      {savedMsgIdx !== null && (
        <motion.div
          className="dd-save-toast"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Saved to My Notes
        </motion.div>
      )}
    </AnimatePresence>
  );
}
