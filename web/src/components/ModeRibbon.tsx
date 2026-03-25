import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModeId } from "../types";
import { useUiStore } from "../stores/uiStore";

interface TabDef {
  id: ModeId;
  icon: React.ReactNode;
  label: string;
}

const svgProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// ---- CORE MODES (always visible) ----
const CORE_TABS: TabDef[] = [
  {
    id: "course-dashboard",
    icon: (
      <svg {...svgProps}>
        <rect x="3" y="12" width="4" height="9" />
        <rect x="10" y="6" width="4" height="15" />
        <rect x="17" y="2" width="4" height="19" />
      </svg>
    ),
    label: "Dashboard",
  },
  {
    id: "plan",
    icon: (
      <svg {...svgProps}>
        <path d="M9 2h6v3H9z" />
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <line x1="9" y1="10" x2="15" y2="10" />
        <line x1="9" y1="14" x2="15" y2="14" />
        <line x1="9" y1="18" x2="13" y2="18" />
      </svg>
    ),
    label: "Plan",
  },
  {
    id: "quiz",
    icon: (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9 9a3 3 0 0 1 5.12 2.13c0 2-3.12 2.37-3.12 4.37" />
        <circle cx="12" cy="19" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    label: "Quiz",
  },
  {
    id: "flashcards",
    icon: (
      <svg {...svgProps}>
        <rect x="2" y="6" width="16" height="14" rx="2" />
        <rect x="6" y="2" width="16" height="14" rx="2" />
      </svg>
    ),
    label: "Cards",
  },
  {
    id: "mindmap",
    icon: (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="3" />
        <circle cx="4" cy="5" r="2" />
        <circle cx="20" cy="5" r="2" />
        <circle cx="4" cy="19" r="2" />
        <circle cx="20" cy="19" r="2" />
        <line x1="10" y1="10" x2="5.5" y2="6.5" />
        <line x1="14" y1="10" x2="18.5" y2="6.5" />
        <line x1="10" y1="14" x2="5.5" y2="17.5" />
        <line x1="14" y1="14" x2="18.5" y2="17.5" />
      </svg>
    ),
    label: "Mind Map",
  },
  {
    id: "deep-dive",
    icon: (
      <svg {...svgProps}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
      </svg>
    ),
    label: "Deep Dive",
  },
  {
    id: "notes",
    icon: (
      <svg {...svgProps}>
        <path d="M17 3l4 4L7 21H3v-4L17 3z" />
        <line x1="14" y1="6" x2="18" y2="10" />
      </svg>
    ),
    label: "My Notes",
  },
];

// ---- ADVANCED MODES (toggle) ----
const ADVANCED_TABS: TabDef[] = [
  {
    id: "cheat-sheet",
    icon: (
      <svg {...svgProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
        <polyline points="14,2 14,8 20,8" />
        <polyline points="9,15 11,17 15,13" />
      </svg>
    ),
    label: "Cheat Sheet",
  },
  {
    id: "lo-study",
    icon: (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    label: "LO Study",
  },
  {
    id: "alignment",
    icon: (
      <svg {...svgProps}>
        <line x1="4" y1="12" x2="20" y2="12" />
        <polyline points="8,8 4,12 8,16" />
        <polyline points="16,8 20,12 16,16" />
      </svg>
    ),
    label: "Alignment",
  },
  {
    id: "deviation",
    icon: (
      <svg {...svgProps}>
        <polyline points="3,6 9,12 13,8 21,18" />
        <polyline points="16,18 21,18 21,13" />
      </svg>
    ),
    label: "Deviation",
  },
  {
    id: "lecturer-note",
    icon: (
      <svg {...svgProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="14" y2="17" />
      </svg>
    ),
    label: "Lecturer",
  },
  {
    id: "connections",
    icon: (
      <svg {...svgProps}>
        <polyline points="16,3 21,3 21,8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21,16 21,21 16,21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    ),
    label: "Connections",
  },
  {
    id: "history",
    icon: (
      <svg {...svgProps}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" />
      </svg>
    ),
    label: "Lessons",
  },
  {
    id: "study-hub",
    icon: (
      <svg {...svgProps}>
        <circle cx="9" cy="7" r="3" />
        <circle cx="17" cy="7" r="3" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <path d="M17 11a4 4 0 0 1 4 4v2" />
      </svg>
    ),
    label: "Study Hub",
  },
];

function TabRow({ tabs, mode, setMode, scrollRef }: {
  tabs: TabDef[];
  mode: ModeId;
  setMode: (m: ModeId) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="mr-scroll" ref={scrollRef}>
      {tabs.map((t) => {
        const isActive = mode === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setMode(t.id)}
            className={`mr-tab${isActive ? " mr-tab--active" : ""}`}
          >
            <span className="mr-tab__icon">{t.icon}</span>
            <span className="mr-tab__label">{t.label}</span>
            {isActive && (
              <motion.div
                className="mr-tab__indicator"
                layoutId="mr-indicator"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function ModeRibbon({
  mode,
  setMode,
}: {
  mode: ModeId;
  setMode: (m: ModeId) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const showAdvanced = useUiStore((s) => s.showAdvancedModes);
  const toggleAdvanced = useUiStore((s) => s.toggleAdvancedModes);

  // Auto-open advanced row if active mode is in advanced tabs
  const isAdvancedMode = ADVANCED_TABS.some((t) => t.id === mode);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(".mr-tab--active");
    if (active) {
      const elRect = el.getBoundingClientRect();
      const tabRect = active.getBoundingClientRect();
      if (tabRect.left < elRect.left + 20 || tabRect.right > elRect.right - 20) {
        active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [mode]);

  return (
    <div className="mr" role="tablist" aria-label="Study modes">
      {/* Core row */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <TabRow tabs={CORE_TABS} mode={mode} setMode={setMode} scrollRef={scrollRef} />
        <button
          className="mr-toggle-btn"
          onClick={toggleAdvanced}
          title={showAdvanced || isAdvancedMode ? "Gelişmiş modları gizle" : "Daha fazla mod"}
          style={{
            flexShrink: 0,
            padding: "4px 8px",
            background: "none",
            border: "none",
            color: (showAdvanced || isAdvancedMode) ? "var(--accent-2)" : "var(--muted)",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 3,
            whiteSpace: "nowrap",
          }}
        >
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            style={{
              transform: (showAdvanced || isAdvancedMode) ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          >
            <path d="M3 4.5l3 3 3-3" />
          </svg>
          {!(showAdvanced || isAdvancedMode) && "Daha Fazla"}
        </button>
      </div>

      {/* Advanced row */}
      <AnimatePresence>
        {(showAdvanced || isAdvancedMode) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden", borderTop: "1px solid var(--border)" }}
          >
            <div style={{ background: "var(--bg-elevated)", paddingTop: 2, paddingBottom: 2 }}>
              <TabRow tabs={ADVANCED_TABS} mode={mode} setMode={setMode} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
