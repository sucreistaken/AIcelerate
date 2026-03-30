// admin/modules/dashboard/components/ActivityFeed.tsx
import type { AuditEntry } from "../../../types";

interface ActivityFeedProps {
  entries: AuditEntry[];
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="admin-card" style={{ padding: "1.5rem" }}>
        <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>
          Son Aktiviteler
        </h3>
        <p style={{ color: "#94a3b8" }}>Henuz aktivite bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="admin-card" style={{ padding: "1.5rem" }}>
      <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>
        Son Aktiviteler
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.75rem 1rem",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div>
              <span style={{ fontWeight: 500 }}>{entry.action}</span>
              <span style={{ color: "#94a3b8", marginLeft: "0.5rem" }}>
                {entry.resource}
              </span>
            </div>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
              {new Date(entry.timestamp).toLocaleString("tr-TR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
