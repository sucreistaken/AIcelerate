import { motion } from "framer-motion";
import { FlashcardStats as FlashcardStatsType } from "../../types";

interface FlashcardStatsProps {
  stats: FlashcardStatsType;
}

const STAT_ITEMS = [
  { key: "total", label: "Total", color: "var(--text)" },
  { key: "new", label: "New", color: "var(--accent-2)" },
  { key: "learning", label: "Learning", color: "var(--warning)" },
  { key: "review", label: "Review", color: "var(--accent-2)" },
  { key: "graduated", label: "Graduated", color: "var(--success)" },
  { key: "dueToday", label: "Due Today", color: "var(--danger)" },
] as const;

export default function FlashcardStats({ stats }: FlashcardStatsProps) {
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
      {STAT_ITEMS.map(({ key, label, color }) => (
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
