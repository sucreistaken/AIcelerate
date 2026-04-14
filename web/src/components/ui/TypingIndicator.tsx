// Shared typing indicator — three bouncing dots, matches existing .sh-dive__dot style
// Use inside chat bubbles or beside status labels.

import { motion } from "framer-motion";

export interface TypingIndicatorProps {
  /** Optional label shown before the dots (default: "AI d\u00FC\u015F\u00FCn\u00FCyor"). Pass null to hide label entirely. */
  label?: string | null;
  /** Smaller footprint — drops the label by default and shrinks dot size. */
  compact?: boolean;
  /** Override dot color (defaults to var(--muted)). */
  color?: string;
  /** Optional class on the outer wrapper — useful when embedding in an existing bubble. */
  className?: string;
}

const DEFAULT_LABEL = "AI d\u00FC\u015F\u00FCn\u00FCyor";

const bounceTransition = (delay: number) => ({
  repeat: Infinity,
  duration: 1.4,
  ease: "easeInOut" as const,
  delay,
});

export function TypingIndicator({ label, compact = false, color, className = "" }: TypingIndicatorProps) {
  const resolvedLabel = label === null ? null : (label ?? (compact ? null : DEFAULT_LABEL));
  const dotSize = compact ? 5 : 6;
  const dotColor = color ?? "var(--muted)";

  return (
    <span
      className={`typing-indicator ${className}`.trim()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 6 : 8,
      }}
      role="status"
      aria-live="polite"
      aria-label={resolvedLabel ?? "AI is responding"}
    >
      {resolvedLabel && (
        <span
          className="typing-indicator__label"
          style={{ fontSize: compact ? 11 : 13, color: "var(--muted)" }}
        >
          {resolvedLabel}
        </span>
      )}
      <span
        className="typing-indicator__dots"
        aria-hidden="true"
        style={{ display: "inline-flex", gap: 3, alignItems: "center" }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="typing-indicator__dot"
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              background: dotColor,
              display: "inline-block",
            }}
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={bounceTransition(i * 0.18)}
          />
        ))}
      </span>
    </span>
  );
}

export default TypingIndicator;
