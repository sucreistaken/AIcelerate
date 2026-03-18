import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Step {
  label: string;
  delay: number; // ms after start to begin this step
}

interface ProgressStepperProps {
  isActive: boolean;
  onComplete?: () => void;
  steps?: Step[];
}

const DEFAULT_STEPS: Step[] = [
  { label: "Materyal analiz ediliyor...", delay: 0 },
  { label: "Plan oluşturuluyor...", delay: 3000 },
  { label: "Vurgular çıkarılıyor...", delay: 6000 },
  { label: "Tamamlandı!", delay: 0 }, // auto-triggered on completion
];

export function ProgressStepper({
  isActive,
  onComplete,
  steps = DEFAULT_STEPS,
}: ProgressStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Reset when activated
  useEffect(() => {
    if (isActive) {
      setCurrentStep(0);
      setCompleted(false);
    }
  }, [isActive]);

  // Simulate step progression
  useEffect(() => {
    if (!isActive || completed) return;

    const timers: NodeJS.Timeout[] = [];

    // Schedule intermediate steps (skip last step - that's for completion)
    for (let i = 1; i < steps.length - 1; i++) {
      const timer = setTimeout(() => {
        setCurrentStep(i);
      }, steps[i].delay);
      timers.push(timer);
    }

    return () => timers.forEach(clearTimeout);
  }, [isActive, completed, steps]);

  // When isActive transitions to false, show completion
  useEffect(() => {
    if (!isActive && currentStep > 0 && !completed) {
      setCurrentStep(steps.length - 1);
      setCompleted(true);
      if (onComplete) {
        const timer = setTimeout(onComplete, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isActive]);

  if (!isActive && !completed) return null;
  if (completed && !isActive) {
    // Show completed state briefly then hide
    return null;
  }

  return (
    <motion.div
      className="progress-stepper"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      {steps.map((step, i) => {
        const isDone = i < currentStep;
        const isActiveStep = i === currentStep;
        const isPending = i > currentStep;

        return (
          <div
            key={i}
            className={`progress-stepper__step${
              isDone ? " progress-stepper__step--done" : ""
            }${isActiveStep ? " progress-stepper__step--active" : ""}`}
          >
            <div className="progress-stepper__indicator">
              {isDone ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 7l3 3 7-7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <div className="progress-stepper__content">
              <div className="progress-stepper__title">
                {step.label}
                {isActiveStep && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ marginLeft: 4 }}
                  >
                    ●
                  </motion.span>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="progress-stepper__line" />
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
