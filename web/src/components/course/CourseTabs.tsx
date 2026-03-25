import type { ActiveTab } from "../../hooks/useCourseDashboard";

const TABS: Array<{ id: ActiveTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "progress", label: "Progress" },
  { id: "schedule", label: "Schedule" },
];

interface CourseTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export function CourseTabs({ activeTab, onTabChange }: CourseTabsProps) {
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 4 }}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: "8px 16px", fontSize: 13, fontWeight: 600,
            background: activeTab === tab.id ? "var(--accent-2)" : "transparent",
            color: activeTab === tab.id ? "white" : "var(--text)",
            border: "none", borderRadius: 8, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
