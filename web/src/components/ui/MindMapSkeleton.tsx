import React from "react";
import { motion } from "framer-motion";
import { t } from "../../utils/i18n";

// Node layout data for the skeleton mind map
const BRANCHES = [
  // Top-left branch
  { x: 120, y: 65, w: 100, h: 28, delay: 0.3, line: { cx: 240, cy: 155, ex: 120, ey: 79, delay: 0.1 } },
  // Left branch
  { x: 65, y: 145, w: 110, h: 28, delay: 0.5, line: { cx: 240, cy: 160, ex: 65, ey: 159, delay: 0.3 } },
  // Bottom-left branch
  { x: 100, y: 225, w: 95, h: 28, delay: 0.7, line: { cx: 240, cy: 165, ex: 100, ey: 239, delay: 0.5 } },
  // Top-right branch
  { x: 355, y: 55, w: 105, h: 28, delay: 0.4, line: { cx: 240, cy: 155, ex: 355, ey: 69, delay: 0.2 } },
  // Right branch
  { x: 375, y: 135, w: 90, h: 28, delay: 0.6, line: { cx: 240, cy: 160, ex: 375, ey: 149, delay: 0.4 } },
  // Bottom-right branch
  { x: 340, y: 230, w: 115, h: 28, delay: 0.8, line: { cx: 240, cy: 165, ex: 340, ey: 244, delay: 0.6 } },
];

// Sub-branches (smaller nodes extending from main branches)
const SUB_BRANCHES = [
  { from: 0, x: 30, y: 35, w: 72, h: 22, delay: 1.0, lineDelay: 0.8 },
  { from: 0, x: 60, y: 98, w: 65, h: 22, delay: 1.1, lineDelay: 0.9 },
  { from: 3, x: 410, y: 25, w: 60, h: 22, delay: 1.2, lineDelay: 1.0 },
  { from: 4, x: 430, y: 170, w: 50, h: 22, delay: 1.3, lineDelay: 1.1 },
  { from: 5, x: 380, y: 270, w: 78, h: 22, delay: 1.4, lineDelay: 1.2 },
  { from: 2, x: 48, y: 268, w: 68, h: 22, delay: 1.5, lineDelay: 1.3 },
];

export default function MindMapSkeleton() {
  return (
    <div className="mindmap-skeleton">
      {/* Background glow */}
      <div className="mindmap-skeleton__canvas">
        <svg
          viewBox="0 0 480 310"
          fill="none"
          style={{ width: "100%", height: "100%" }}
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="mindmap-shimmer-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--skeleton-base)" />
              <stop offset="50%" stopColor="var(--skeleton-shine)" />
              <stop offset="100%" stopColor="var(--skeleton-base)" />
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                values="-1 0; 2 0"
                dur="2s"
                repeatCount="indefinite"
              />
            </linearGradient>
            <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Center glow */}
          <motion.circle
            cx="240" cy="160" r="80"
            fill="url(#center-glow)"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.05, 0.9] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Branch lines (drawn with animation) */}
          {BRANCHES.map((b, i) => (
            <motion.path
              key={`line-${i}`}
              d={`M ${b.line.cx} ${b.line.cy} Q ${(b.line.cx + b.line.ex) / 2} ${(b.line.cy + b.line.ey) / 2 + (i % 2 === 0 ? -8 : 8)} ${b.line.ex + b.w / 2} ${b.line.ey}`}
              stroke="var(--skeleton-base)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{ duration: 0.6, delay: b.line.delay, ease: "easeOut" }}
            />
          ))}

          {/* Sub-branch lines */}
          {SUB_BRANCHES.map((sb, i) => {
            const parent = BRANCHES[sb.from];
            const px = parent.x + parent.w / 2;
            const py = parent.y + parent.h / 2;
            return (
              <motion.line
                key={`sub-line-${i}`}
                x1={px} y1={py}
                x2={sb.x + sb.w / 2} y2={sb.y + sb.h / 2}
                stroke="var(--skeleton-base)"
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 0.4, delay: sb.lineDelay, ease: "easeOut" }}
              />
            );
          })}

          {/* Central node */}
          <motion.circle
            cx="240" cy="160" r="32"
            fill="url(#mindmap-shimmer-gradient)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          />
          <motion.circle
            cx="240" cy="160" r="22"
            fill="var(--skeleton-shine)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: [0.4, 0.7, 0.4] }}
            transition={{
              scale: { duration: 0.4, delay: 0.15, ease: "easeOut" },
              opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          {/* Branch nodes (pill shapes) */}
          {BRANCHES.map((b, i) => (
            <motion.rect
              key={`node-${i}`}
              x={b.x} y={b.y}
              width={b.w} height={b.h}
              rx="14" ry="14"
              fill="url(#mindmap-shimmer-gradient)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.85 }}
              transition={{
                duration: 0.4,
                delay: b.delay,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              style={{ transformOrigin: `${b.x + b.w / 2}px ${b.y + b.h / 2}px` }}
            />
          ))}

          {/* Sub-branch nodes (smaller pills) */}
          {SUB_BRANCHES.map((sb, i) => (
            <motion.rect
              key={`sub-node-${i}`}
              x={sb.x} y={sb.y}
              width={sb.w} height={sb.h}
              rx="11" ry="11"
              fill="url(#mindmap-shimmer-gradient)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.6 }}
              transition={{
                duration: 0.35,
                delay: sb.delay,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              style={{ transformOrigin: `${sb.x + sb.w / 2}px ${sb.y + sb.h / 2}px` }}
            />
          ))}
        </svg>
      </div>

      {/* Loading text with animated dots */}
      <div className="mindmap-skeleton__text">
        <div className="mindmap-skeleton__text-label">
          {t("mindmap.aiConnecting")}
          <span className="mindmap-skeleton__dots">
            <span className="mindmap-skeleton__dot" />
            <span className="mindmap-skeleton__dot" />
            <span className="mindmap-skeleton__dot" />
          </span>
        </div>
      </div>
    </div>
  );
}
