import React from "react";
import { ConceptConnection } from "../../types";
import { strengthClass } from "./helpers";

interface ListViewProps {
  connections: ConceptConnection[];
  selectedConcept: string | null;
  onSelect: (concept: string) => void;
}

function ListView({ connections, selectedConcept, onSelect }: ListViewProps) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {connections.map((conn, i) => (
        <div
          key={i}
          className={`conn-card${selectedConcept === conn.concept ? " conn-card--selected" : ""}`}
          onClick={() => onSelect(conn.concept)}
          style={{ cursor: "pointer" }}
        >
          <div className="conn-header">
            <span className="conn-concept">{conn.concept}</span>
            <span className={`conn-strength ${strengthClass(conn.strength)}`}>
              {Math.round(conn.strength * 100)}%
            </span>
          </div>

          <div className="conn-lessons">
            {conn.lessonTitles.map((title, j) => (
              <span key={j} className="conn-lesson-tag">
                {title.length > 30 ? title.slice(0, 30) + "..." : title}
              </span>
            ))}
          </div>

          {conn.relatedConcepts.length > 0 && (
            <div className="conn-related">
              Related: {conn.relatedConcepts.slice(0, 3).join(", ")}
            </div>
          )}

          {conn.aiInsight && (
            <div className="conn-insight">{conn.aiInsight}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default React.memo(ListView);
