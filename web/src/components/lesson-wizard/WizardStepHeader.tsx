import React from "react";
import type { WizardStep } from "../../hooks/useLessonWizard";

const STEPS = [
  { num: 1 as WizardStep, label: "Bilgi", color: "#4CAF50" },
  { num: 2 as WizardStep, label: "Slaytlar", color: "#2196F3" },
  { num: 3 as WizardStep, label: "Ders Kaydı", color: "#FF9800" },
  { num: 4 as WizardStep, label: "Özet & Analiz", color: "#9C27B0" },
];

interface Props {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
  completedSteps?: Set<number>;
}

export default function WizardStepHeader({ currentStep, onStepClick, completedSteps }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, margin: "24px 0 32px" }}>
      {STEPS.map((s, i) => {
        const isActive = currentStep === s.num;
        const isCompleted = completedSteps?.has(s.num) || s.num < currentStep;
        const isClickable = isCompleted && onStepClick && s.num < currentStep;

        return (
          <React.Fragment key={s.num}>
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: isClickable ? "pointer" : "default" }}
              onClick={() => isClickable && onStepClick?.(s.num)}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: isActive ? s.color : isCompleted ? s.color : "var(--card-hover)",
                  color: isActive || isCompleted ? "#fff" : "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  opacity: isActive ? 1 : isCompleted ? 0.85 : 0.5,
                  transition: "all 0.3s ease",
                  boxShadow: isActive ? `0 0 12px ${s.color}40` : "none",
                }}
              >
                {isCompleted && !isActive ? "✓" : s.num}
              </div>
              <span
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? s.color : "var(--muted)",
                  transition: "all 0.3s ease",
                }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 48,
                  height: 2,
                  background: isCompleted ? s.color : "var(--border)",
                  marginBottom: 20,
                  transition: "background 0.3s ease",
                  opacity: isCompleted ? 0.6 : 0.3,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
