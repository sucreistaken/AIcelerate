import { motion } from "framer-motion";
import { QUICK_ACTIONS } from "./types";
import { t } from "../../utils/i18n";

interface Props {
  send: (query: string) => void;
}

export default function DeepDiveWelcome({ send }: Props) {
  return (
    <div className="dd__welcome">
      <motion.div
        className="dd__welcome-hero"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="dd__welcome-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h2 className="dd__welcome-title">{t("deepDive.welcome") || "What would you like to explore?"}</h2>
        <p className="dd__welcome-sub">{t("deepDive.welcomeSub") || "Ask anything about this lesson."}</p>
      </motion.div>

      <div className="dd__welcome-grid">
        {QUICK_ACTIONS.map((action, i) => (
          <motion.button
            key={action.labelKey}
            className="dd__welcome-card"
            onClick={() => send(action.query)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
            whileHover={{ y: -2 }}
          >
            <span className="dd__welcome-card-icon">{action.icon}</span>
            <span className="dd__welcome-card-label">{t(action.labelKey)}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
