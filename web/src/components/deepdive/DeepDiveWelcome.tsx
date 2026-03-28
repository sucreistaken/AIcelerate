import { motion } from "framer-motion";
import { QUICK_ACTIONS } from "./types";
import { t } from "../../utils/i18n";

interface DeepDiveWelcomeProps {
  send: (query: string) => void;
}

export default function DeepDiveWelcome({ send }: DeepDiveWelcomeProps) {
  return (
    <div className="dd-welcome">
      <motion.div
        className="dd-welcome-icon"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </motion.div>
      <motion.h2
        className="dd-welcome-title"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        {t("deepDive.welcome")}
      </motion.h2>
      <motion.p
        className="dd-welcome-sub"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {t("deepDive.welcomeSub")}
      </motion.p>
      <motion.p
        style={{ fontSize: 11, color: "var(--muted)", maxWidth: 380, textAlign: "center", lineHeight: 1.5, margin: "0 auto" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {t("deepDive.welcomeHint")}
      </motion.p>

      <motion.div
        className="dd-suggestions-grid"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {QUICK_ACTIONS.map((action, i) => (
          <motion.button
            key={i}
            className="dd-suggestion-card"
            onClick={() => send(action.query)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="dd-suggestion-icon">{action.icon}</span>
            <span className="dd-suggestion-label">{t(action.labelKey)}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
