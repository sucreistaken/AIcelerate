import React, { useMemo } from "react";
import type { ModeId } from "../types";

interface TabDef {
  id: ModeId;
  icon: React.ReactNode;
  label: string;
}

interface TabGroup {
  label: string;
  tabs: TabDef[];
}

const svgProps = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const GROUPS: TabGroup[] = [
  {
    label: "Course",
    tabs: [
      { id: "course-dashboard", label: "Dashboard", icon: <svg {...svgProps}><rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="2" width="4" height="19"/></svg> },
    ],
  },
  {
    label: "Analysis",
    tabs: [
      { id: "plan", label: "Plan", icon: <svg {...svgProps}><path d="M9 2h6v3H9z"/><rect x="5" y="4" width="14" height="17" rx="2"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/><line x1="9" y1="18" x2="13" y2="18"/></svg> },
      { id: "alignment", label: "Alignment", icon: <svg {...svgProps}><line x1="4" y1="12" x2="20" y2="12"/><polyline points="8,8 4,12 8,16"/><polyline points="16,8 20,12 16,16"/></svg> },
      { id: "deviation", label: "Deviation", icon: <svg {...svgProps}><polyline points="3,6 9,12 13,8 21,18"/><polyline points="16,18 21,18 21,13"/></svg> },
    ],
  },
  {
    label: "Study",
    tabs: [
      { id: "lecturer-note", label: "Notes", icon: <svg {...svgProps}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><polyline points="14,2 14,8 20,8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg> },
      { id: "deep-dive", label: "Deep Dive", icon: <svg {...svgProps}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
      { id: "lo-study", label: "LO Study", icon: <svg {...svgProps}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
      { id: "mindmap", label: "Mind Map", icon: <svg {...svgProps}><circle cx="12" cy="12" r="3"/><circle cx="4" cy="5" r="2"/><circle cx="20" cy="5" r="2"/><circle cx="4" cy="19" r="2"/><circle cx="20" cy="19" r="2"/><line x1="10" y1="10" x2="5.5" y2="6.5"/><line x1="14" y1="10" x2="18.5" y2="6.5"/><line x1="10" y1="14" x2="5.5" y2="17.5"/><line x1="14" y1="14" x2="18.5" y2="17.5"/></svg> },
    ],
  },
  {
    label: "Practice",
    tabs: [
      { id: "quiz", label: "Quiz", icon: <svg {...svgProps}><circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 015.12 2.13c0 2-3.12 2.37-3.12 4.37"/><circle cx="12" cy="19" r="0.5" fill="currentColor" stroke="none"/></svg> },
      { id: "flashcards", label: "Flashcards", icon: <svg {...svgProps}><rect x="2" y="6" width="16" height="14" rx="2"/><rect x="6" y="2" width="16" height="14" rx="2"/></svg> },
    ],
  },
  {
    label: "Resources",
    tabs: [
      { id: "cheat-sheet", label: "Cheat Sheet", icon: <svg {...svgProps}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><polyline points="14,2 14,8 20,8"/><polyline points="9,15 11,17 15,13"/></svg> },
      { id: "notes", label: "My Notes", icon: <svg {...svgProps}><path d="M17 3l4 4L7 21H3v-4L17 3z"/><line x1="14" y1="6" x2="18" y2="10"/></svg> },
      { id: "connections", label: "Connections", icon: <svg {...svgProps}><polyline points="16,3 21,3 21,8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21,16 21,21 16,21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg> },
    ],
  },
  {
    label: "Manage",
    tabs: [
      { id: "history", label: "Lessons", icon: <svg {...svgProps}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/></svg> },
      { id: "study-hub", label: "Study Hub", icon: <svg {...svgProps}><circle cx="9" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M17 11a4 4 0 014 4v2"/></svg> },
    ],
  },
];

export default function ModeRibbon({ mode, setMode }: { mode: ModeId; setMode: (m: ModeId) => void }) {
  const activeGroupIndex = useMemo(() => {
    for (let i = 0; i < GROUPS.length; i++) {
      if (GROUPS[i].tabs.some((t) => t.id === mode)) return i;
    }
    return 0;
  }, [mode]);

  const activeGroup = GROUPS[activeGroupIndex];

  return (
    <div className="mr" role="tablist" aria-label="Study modes">
      {/* Tier 1: Group Segments */}
      <div className="mr-segments">
        {GROUPS.map((group, i) => (
          <button
            key={group.label}
            className={`mr-seg${activeGroupIndex === i ? " mr-seg--active" : ""}`}
            onClick={() => {
              if (!group.tabs.some((t) => t.id === mode)) {
                setMode(group.tabs[0].id);
              }
            }}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Tier 2: Child Tabs (hide if only 1 tab) */}
      {activeGroup.tabs.length > 1 && (
        <div className="mr-children">
          {activeGroup.tabs.map((t) => {
            const isActive = mode === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setMode(t.id)}
                className={`mr-tab${isActive ? " mr-tab--active" : ""}`}
                title={t.label}
              >
                <span className="mr-tab__icon">{t.icon}</span>
                <span className="mr-tab__label">{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
