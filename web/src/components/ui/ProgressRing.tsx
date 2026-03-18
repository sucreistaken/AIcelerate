import React from "react";

interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  showPercent?: boolean;
}

export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  color = "var(--accent-2)",
  label,
  showPercent = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - clamped);
  const isComplete = clamped >= 1;
  const percent = Math.round(clamped * 100);

  return (
    <div
      className={`progress-ring${isComplete ? " progress-ring--complete" : ""}`}
      style={{ width: size, height: size }}
      title={label || `${percent}%`}
    >
      <svg
        className="progress-ring__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className="progress-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-ring__fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={isComplete ? "var(--success)" : color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {showPercent && (
        <div className="progress-ring__label">
          {isComplete ? "✓" : `${percent}%`}
        </div>
      )}
    </div>
  );
}
