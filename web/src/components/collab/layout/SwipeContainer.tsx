import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import { t } from "../../../utils/i18n";

interface Props {
  activePanel: number;
  onPanelChange: (index: number) => void;
  children: React.ReactNode[];
}

const PANEL_KEYS = ["studyHub.panelServers", "studyHub.panelChannels", "studyHub.panelContent"] as const;
const DRAG_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;
const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

export default function SwipeContainer({ activePanel, onPanelChange, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const panelCount = children.length;

  // Track width via ResizeObserver — fixes orientation change / browser chrome changes.
  const [width, setWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 0,
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Snap to active panel when width or activePanel changes (external navigation).
  useEffect(() => {
    if (width <= 0) return;
    const target = -activePanel * width;
    const controls = animate(x, target, SPRING);
    return () => controls.stop();
  }, [activePanel, width, x]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    let newPanel = activePanel;
    if (offset < -DRAG_THRESHOLD || velocity < -VELOCITY_THRESHOLD) {
      newPanel = Math.min(activePanel + 1, panelCount - 1);
    } else if (offset > DRAG_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      newPanel = Math.max(activePanel - 1, 0);
    }

    onPanelChange(newPanel);
  };

  const minX = -(panelCount - 1) * width;

  return (
    <div className="sh-swipe-container" ref={containerRef}>
      <div className="sh-swipe-dots" role="tablist" aria-label="Panels">
        {PANEL_KEYS.slice(0, panelCount).map((key, i) => {
          const label = t(key);
          const isActive = activePanel === i;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`sh-panel-${i}`}
              className={`sh-swipe-dot ${isActive ? "sh-swipe-dot--active" : ""}`}
              onClick={() => onPanelChange(i)}
              title={label}
            >
              <span className="sh-swipe-dot__label">{label}</span>
            </button>
          );
        })}
      </div>

      <motion.div
        className="sh-swipe-track"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: minX, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        dragMomentum={false}
      >
        {children.map((child, i) => (
          <div
            key={i}
            id={`sh-panel-${i}`}
            role="tabpanel"
            className="sh-swipe-panel"
          >
            {child}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
