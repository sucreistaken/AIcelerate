import { motion } from "framer-motion";
import { FlashcardStats as FlashcardStatsType } from "../../types";
import { t } from "../../utils/i18n";
import { useUiStore } from "../../stores/uiStore";

interface FlashcardStatsProps {
  stats: FlashcardStatsType;
}

function getStatItems() {
  return [
    { key: "total", label: t("flashcard.statTotal"), color: "var(--text)" },
    { key: "new", label: t("flashcard.statNew"), color: "var(--accent-2)" },
    { key: "learning", label: t("flashcard.statLearning"), color: "var(--warning)" },
    { key: "review", label: t("flashcard.statReview"), color: "var(--accent-2)" },
    { key: "graduated", label: t("flashcard.statGraduated"), color: "var(--success)" },
    { key: "dueToday", label: t("flashcard.statDue"), color: "var(--danger)" },
  ];
}

export default function FlashcardStats({ stats }: FlashcardStatsProps) {
  useUiStore((s) => s.language);
  return (
    <motion.div
      className="fc-stat-grid"
      style={{ marginBottom: 14 }}
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06 } },
      }}
    >
      {getStatItems().map(({ key, label, color }) => (
        <motion.div
          key={key}
          className="fc-stat-card"
          variants={{
            hidden: { opacity: 0, y: 12, scale: 0.95 },
            show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4 } },
          }}
          whileHover={{ y: -3, scale: 1.02 }}
        >
          <div className="fc-stat-value" style={{ color }}>
            {(stats as unknown as Record<string, number>)[key]}
          </div>
          <div className="fc-stat-label">{label}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
