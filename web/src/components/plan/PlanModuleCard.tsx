import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModuleT, LearningOutcome } from "../../types";

function prettyMinutes(min?: number) {
  if (!min && min !== 0) return "";
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}s ${m}dk` : `${h}s`;
}

interface Props {
  mod: ModuleT;
  index: number;
  defaultOpen?: boolean;
  learningOutcomes?: LearningOutcome[];
}

export default function PlanModuleCard({ mod, index, defaultOpen = false, learningOutcomes = [] }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const lessonCount = mod.lessons?.length || 0;
  const totalMin = (mod.lessons || []).reduce((s, l) => s + (l.study_time_min || 0), 0);

  return (
    <motion.section
      className={`pp__module${open ? " pp__module--open" : ""}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 + index * 0.04 }}
    >
      <button className="pp__module-header" onClick={() => setOpen((o) => !o)}>
        <div className="pp__module-number">{index + 1}</div>
        <div className="pp__module-info">
          <div className="pp__module-title">{mod.title}</div>
          <div className="pp__module-goal">{mod.goal}</div>
        </div>
        <div className="pp__module-meta-right">
          {lessonCount > 0 && <span className="pp__module-badge">{lessonCount} ders</span>}
          {totalMin > 0 && <span className="pp__module-badge pp__module-badge--time">{prettyMinutes(totalMin)}</span>}
          <div className={`pp__module-chevron${open ? " pp__module-chevron--open" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="pp__module-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="pp__module-body-inner">
              <div className="pp__lessons">
                {mod.lessons?.map((l, li) => {
                  const loTags = learningOutcomes
                    .filter(
                      (lo) =>
                        lo.covered_by_lessons &&
                        lo.covered_by_lessons.some(
                          (name) => name.toLowerCase().trim() === String(l.title).toLowerCase().trim(),
                        ),
                    )
                    .map((lo) => lo.code)
                    .filter(Boolean);

                  return (
                    <motion.div
                      key={li}
                      className="pp__lesson"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: li * 0.04 }}
                    >
                      <div className="pp__lesson-header">
                        <div className="pp__lesson-title">{l.title}</div>
                        {l.study_time_min ? (
                          <span className="pp__lesson-time">{prettyMinutes(l.study_time_min)}</span>
                        ) : null}
                      </div>

                      {loTags.length > 0 && (
                        <div className="pp__lesson-lo-tags">
                          {loTags.map((code) => (
                            <span key={code} className="pp__lo-tag">{code}</span>
                          ))}
                        </div>
                      )}

                      <p className="pp__lesson-objective">{l.objective}</p>

                      {l.activities?.length ? (
                        <div className="pp__activities">
                          {l.activities.map((a, ai) => (
                            <div key={ai} className="pp__activity">
                              <span className="pp__activity-type">{a.type}</span>
                              <span className="pp__activity-prompt">{a.prompt}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {l.mini_quiz?.length ? (
                        <div className="pp__quiz-box">
                          <div className="pp__quiz-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            Mini Quiz
                          </div>
                          <ol className="pp__quiz-list">
                            {l.mini_quiz.map((q, qi) => {
                              const qText = typeof q === "object" ? (q as any).question || JSON.stringify(q) : q;
                              return <li key={qi} className="pp__quiz-item">{qText}</li>;
                            })}
                          </ol>
                        </div>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
