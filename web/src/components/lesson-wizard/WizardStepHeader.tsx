import React from "react";
import { motion } from "framer-motion";
import type { WizardStep } from "../../hooks/useLessonWizard";
import { t } from "../../utils/i18n";

const STEPS = [
  { num: 1 as WizardStep, label: "wizard.stepInfo", color: "green", icon: "info" },
  { num: 2 as WizardStep, label: "wizard.stepSlides", color: "blue", icon: "slides" },
  { num: 3 as WizardStep, label: "wizard.stepRecording", color: "orange", icon: "mic" },
  { num: 4 as WizardStep, label: "wizard.stepSummary", color: "purple", icon: "summary" },
] as const;

const COLOR_VALUES: Record<string, string> = {
  green: "#22c55e",
  blue: "#3b82f6",
  orange: "#f59e0b",
  purple: "#a855f7",
};

const STEP_ICONS: Record<string, React.ReactNode> = {
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  ),
  slides: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  mic: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  ),
  summary: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
};

interface Props {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
  completedSteps?: Set<number>;
}

export default function WizardStepHeader({ currentStep, onStepClick, completedSteps }: Props) {
  return (
    <div className="wizard-stepper">
      {STEPS.map((s, i) => {
        const isActive = currentStep === s.num;
        const isCompleted = completedSteps?.has(s.num) || s.num < currentStep;
        const isClickable = isCompleted && onStepClick && s.num < currentStep;

        const stateClass = isActive
          ? "wizard-stepper__step--active"
          : isCompleted
          ? "wizard-stepper__step--completed"
          : "wizard-stepper__step--pending";

        return (
          <React.Fragment key={s.num}>
            <div
              className={`wizard-stepper__step ${stateClass} ${isClickable ? "wizard-stepper__step--clickable" : ""}`}
              data-color={s.color}
              onClick={() => isClickable && onStepClick?.(s.num)}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (isClickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onStepClick?.(s.num);
                }
              }}
            >
              <motion.div
                className="wizard-stepper__indicator"
                initial={false}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {isCompleted && !isActive ? (
                  <svg className="wizard-stepper__check" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <motion.path
                      d="M3.5 9l3.5 3.5 7.5-7.5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    />
                  </svg>
                ) : (
                  STEP_ICONS[s.icon]
                )}
              </motion.div>
              <span className="wizard-stepper__label">
                {t(s.label)}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div
                className={`wizard-stepper__connector ${
                  isCompleted ? "wizard-stepper__connector--completed" : ""
                } ${
                  isActive ? "wizard-stepper__connector--active" : ""
                }`}
              >
                <div
                  className="wizard-stepper__connector-fill"
                  style={{ background: COLOR_VALUES[s.color] }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
