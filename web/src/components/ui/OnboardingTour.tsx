import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUiStore } from "../../stores/uiStore";
import { t } from "../../utils/i18n";

/* ── Constants ── */
const STORAGE_KEY = "lc.onboarding.done";

interface TourStep {
  titleKey: string;
  descKey: string;
  target?: string; // CSS selector for highlight
  placement?: "bottom" | "right" | "center";
}

const STEPS: TourStep[] = [
  { titleKey: "onboarding.step1Title", descKey: "onboarding.step1Desc", placement: "center" },
  { titleKey: "onboarding.step2Title", descKey: "onboarding.step2Desc", target: ".lc-sidebar-mini, .lc-sidebar-drawer", placement: "right" },
  { titleKey: "onboarding.step3Title", descKey: "onboarding.step3Desc", target: ".mr", placement: "bottom" },
  { titleKey: "onboarding.step4Title", descKey: "onboarding.step4Desc", target: ".nav-actions", placement: "bottom" },
];

/* ── Helpers ── */
function hasCompletedOnboarding(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}

function markOnboardingDone() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* noop */ }
}

/* ── Welcome Modal (Step 0) ── */
function WelcomeModal({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <motion.div
      className="ot-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="ot-welcome"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.span
          className="ot-welcome__emoji"
          animate={{ rotate: [0, 14, -8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18.89 13.23l-3.12-7.14a1.5 1.5 0 0 0-2.75 1.2l.51 1.17" />
            <path d="M14.12 8.62L12.38 4.7a1.5 1.5 0 0 0-2.75 1.2l1.45 3.32" />
            <path d="M7.96 10.46L6.81 7.83a1.5 1.5 0 1 0-2.75 1.2l2.48 5.68A6.14 6.14 0 0 0 12.15 19h.01a6.14 6.14 0 0 0 5.61-3.63l.51-1.17" />
            <path d="M10.39 9.5l-.63-1.43a1.5 1.5 0 0 0-2.75 1.2" />
          </svg>
        </motion.span>
        <h1 className="ot-welcome__title ot-welcome__brand">{t("onboarding.welcomeTitle")}</h1>
        <p className="ot-welcome__desc">{t("onboarding.welcomeDesc")}</p>

        <div className="ot-welcome__steps">
          {STEPS.map((step, i) => (
            <div key={i} className={`ot-chip${i === 0 ? " ot-chip--active" : ""}`}>
              <span className="ot-chip__num">{i + 1}</span>
              {t(step.titleKey)}
            </div>
          ))}
        </div>

        <button className="ot-btn-primary" onClick={onStart}>
          {t("onboarding.startTour")}
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12l5-5-5-5" />
          </svg>
        </button>
        <button className="ot-btn-ghost" onClick={onSkip}>{t("onboarding.skipTour")}</button>
      </motion.div>
    </motion.div>
  );
}

/* ── Step Tooltip ── */
function StepTooltip({
  step,
  current,
  total,
  onNext,
  onPrev,
  onClose,
}: {
  step: TourStep;
  current: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ top: 100, left: 100 });

  useEffect(() => {
    if (!step.target) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (step.placement === "right") {
      setPos({ top: rect.top + rect.height / 2 - 60, left: rect.right + 16 });
    } else {
      setPos({ top: rect.bottom + 12, left: rect.left + rect.width / 2 - 160 });
    }
  }, [step]);

  return (
    <>
      {/* Highlight ring on target */}
      {step.target && <HighlightRing selector={step.target} />}

      <motion.div
        className="ot-tooltip"
        style={{ top: pos.top, left: Math.max(16, pos.left) }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="ot-tooltip__badge">
          {t("onboarding.stepOf", { current: String(current + 1), total: String(total) })}
        </div>
        <h3 className="ot-tooltip__title">{t(step.titleKey)}</h3>
        <p className="ot-tooltip__desc">{t(step.descKey)}</p>
        <div className="ot-tooltip__actions">
          <div className="ot-dots">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className={`ot-dot${i === current ? " ot-dot--active" : ""}`} />
            ))}
          </div>
          <div className="ot-tooltip__btns">
            {current > 0 && (
              <button className="ot-btn-sm ot-btn-sm--ghost" onClick={onPrev}>{t("common.back")}</button>
            )}
            <button className="ot-btn-sm" onClick={current === total - 1 ? onClose : onNext}>
              {current === total - 1 ? t("onboarding.finish") : t("common.next")} →
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ── Highlight Ring ── */
function HighlightRing({ selector }: { selector: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = document.querySelector(selector);
    if (el) setRect(el.getBoundingClientRect());
  }, [selector]);

  if (!rect) return null;

  return (
    <motion.div
      className="ot-highlight"
      style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  );
}

/* ── Main Component ── */
export function OnboardingTour() {
  const [phase, setPhase] = useState<"hidden" | "welcome" | "touring">("hidden");
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      const timer = setTimeout(() => setPhase("welcome"), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const finish = useCallback(() => {
    setPhase("hidden");
    markOnboardingDone();
  }, []);

  const startTour = useCallback(() => {
    setPhase("touring");
    setCurrentStep(0);
  }, []);

  if (phase === "hidden") return null;

  return (
    <AnimatePresence mode="wait">
      {phase === "welcome" && (
        <WelcomeModal key="welcome" onStart={startTour} onSkip={finish} />
      )}

      {phase === "touring" && (
        <motion.div
          key="touring"
          className="ot-overlay ot-overlay--touring"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <StepTooltip
            step={STEPS[currentStep]}
            current={currentStep}
            total={STEPS.length}
            onNext={() => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))}
            onPrev={() => setCurrentStep((s) => Math.max(s - 1, 0))}
            onClose={finish}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OnboardingTour;
