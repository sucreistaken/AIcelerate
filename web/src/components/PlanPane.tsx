import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plan, ConfidenceScore } from "../types";
import { t } from "../utils/i18n";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import PlanHeader from "./plan/PlanHeader";
import PlanStats from "./plan/PlanStats";
import PlanModuleCard from "./plan/PlanModuleCard";
import PlanLearningOutcomes from "./plan/PlanLearningOutcomes";
import PlanResources from "./plan/PlanResources";

export default function PlanPane({ plan, confidence }: { plan: Plan; confidence?: ConfidenceScore | null }) {
  const planRef = useRef<HTMLDivElement>(null);
  const [showAllConcepts, setShowAllConcepts] = useState(false);

  const concepts = (plan.key_concepts || []).map((k) =>
    typeof k === "object" ? (k as any).title || JSON.stringify(k) : k,
  );
  const CONCEPT_LIMIT = 12;
  const visibleConcepts = showAllConcepts ? concepts : concepts.slice(0, CONCEPT_LIMIT);

  return (
    <motion.div
      className="pp"
      ref={planRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <PaneInfoBanner
        id="plan"
        title={t("plan.title")}
        description="AI dersinizi analiz ederek haftalik bir ogrenme plani olusturur."
        tips={["Haftalik plan", "Zorluk seviyesi", "Ana kavramlar", "PDF export"]}
      />

      <PlanHeader plan={plan} confidence={confidence} planRef={planRef} />

      <PlanStats plan={plan} />

      {/* Key Concepts */}
      {concepts.length > 0 && (
        <motion.section
          className="pp__concepts"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
        >
          <div className="pp__section-header">
            <div className="pp__section-icon pp__section-icon--concept">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </div>
            <h2 className="pp__section-title">{t("plan.keyConcepts")}</h2>
            <span className="pp__section-count">{concepts.length}</span>
          </div>
          <div className="pp__concepts-chips">
            {visibleConcepts.map((label, i) => (
              <motion.span
                key={i}
                className="pp__concept-chip"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.14 + i * 0.02 }}
              >
                {label}
              </motion.span>
            ))}
            {concepts.length > CONCEPT_LIMIT && (
              <button
                className="pp__concept-toggle"
                onClick={() => setShowAllConcepts((v) => !v)}
              >
                {showAllConcepts ? "Daha az" : `+${concepts.length - CONCEPT_LIMIT} daha`}
              </button>
            )}
          </div>
        </motion.section>
      )}

      <PlanLearningOutcomes outcomes={plan.learning_outcomes || []} />

      {/* Modules */}
      {(plan.modules || []).length > 0 && (
        <div className="pp__modules">
          <div className="pp__section-header">
            <div className="pp__section-icon pp__section-icon--module">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <h2 className="pp__section-title">Moduller</h2>
            <span className="pp__section-count">{plan.modules!.length} modul</span>
          </div>
          {plan.modules!.map((m, idx) => (
            <PlanModuleCard
              key={idx}
              mod={m}
              index={idx}
              defaultOpen={idx === 0}
              learningOutcomes={plan.learning_outcomes || []}
            />
          ))}
        </div>
      )}

      <PlanResources resources={plan.resources || []} />
    </motion.div>
  );
}
