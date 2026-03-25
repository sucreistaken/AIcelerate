import { LoStudyModule } from "../../types";

type Props = {
  modules: LoStudyModule[];
  activeLoId: string | null;
  completedSet: Set<string>;
  onSelectModule: (loId: string) => void;
};

export default function LoModuleList({ modules, activeLoId, completedSet, onSelectModule }: Props) {
  return (
    <div
      className="lc-section"
      style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: 12 }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, paddingLeft: 4 }}>
        Learning Outcomes
      </div>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {modules.map((m, index) => {
          const isActive = m.loId === activeLoId;
          const isDone = completedSet.has(m.loId);

          return (
            <div
              key={m.loId}
              className={`lo-sidebar-item ${isActive ? "lo-sidebar-item--active" : ""}`}
              onClick={() => onSelectModule(m.loId)}
              style={{
                padding: "10px 10px",
                marginBottom: 6,
                borderRadius: 10,
                cursor: "pointer",
                background: isActive ? "var(--accent-2)" : "transparent",
                color: isActive ? "white" : "var(--text)",
                border: isActive ? "none" : "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.15s ease",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: isDone
                    ? "#22c55e"
                    : isActive
                      ? "rgba(255,255,255,0.25)"
                      : "var(--border)",
                  color: isDone || isActive ? "white" : "var(--text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {isDone ? "\✓" : index + 1}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontWeight: 500,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as const,
                  lineHeight: 1.4,
                }}
              >
                {m.loTitle}
              </span>
              <span style={{ fontSize: 10, opacity: 0.7, flexShrink: 0 }}>
                {m.recommended_study_time_min}m
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
