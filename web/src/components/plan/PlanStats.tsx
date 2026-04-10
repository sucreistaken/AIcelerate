import { motion } from "framer-motion";
import { Plan, LearningOutcome } from "../../types";

function prettyMinutes(min?: number) {
  if (!min && min !== 0) return "—";
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}s ${m}dk` : `${h}s`;
}

interface Props {
  plan: Plan;
}

export default function PlanStats({ plan }: Props) {
  const totalLessons = (plan.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  const totalMinutes = (plan.modules || []).reduce(
    (sum, m) => sum + (m.lessons || []).reduce((s, l) => s + (l.study_time_min || 0), 0),
    0,
  );
  const coveredLOs = (plan.learning_outcomes || []).filter((lo: LearningOutcome) => lo.covered).length;
  const totalLOs = (plan.learning_outcomes || []).length;
  const coveragePct = totalLOs > 0 ? Math.round((coveredLOs / totalLOs) * 100) : null;

  const stats = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      value: prettyMinutes(totalMinutes),
      label: "Toplam Sure",
      cls: "pp__stat--time",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
      value: `${totalLessons}`,
      label: "Ders",
      cls: "pp__stat--lessons",
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      value: `${plan.key_concepts?.length || 0}`,
      label: "Ana Kavram",
      cls: "pp__stat--concepts",
    },
    ...(coveragePct !== null
      ? [
          {
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ),
            value: `${coveragePct}%`,
            label: "LO Kapsam",
            cls: "pp__stat--coverage",
          },
        ]
      : []),
  ];

  return (
    <div className="pp__stats">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          className={`pp__stat ${s.cls}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 + i * 0.06 }}
        >
          <div className="pp__stat-icon">{s.icon}</div>
          <div className="pp__stat-body">
            <div className="pp__stat-value">{s.value}</div>
            <div className="pp__stat-label">{s.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
