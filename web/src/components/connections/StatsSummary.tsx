import { useMemo } from "react";
import { ConceptConnection } from "../../types";

interface StatsSummaryProps {
  connections: ConceptConnection[];
}

export default function StatsSummary({ connections }: StatsSummaryProps) {
  const stats = useMemo(() => {
    if (connections.length === 0) {
      return { total: 0, avgStrength: 0, mostConnected: "\—", strongestBridge: "\—" };
    }

    const avgStrength = connections.reduce((s, c) => s + c.strength, 0) / connections.length;

    const lessonCount = new Map<string, number>();
    for (const c of connections) {
      for (const title of c.lessonTitles) {
        lessonCount.set(title, (lessonCount.get(title) || 0) + 1);
      }
    }
    let mostConnected = "\—";
    let maxCount = 0;
    for (const [title, count] of lessonCount) {
      if (count > maxCount) {
        maxCount = count;
        mostConnected = title.length > 25 ? title.slice(0, 25) + "..." : title;
      }
    }

    const strongest = connections[0];
    const strongestBridge = strongest
      ? (strongest.concept.length > 25 ? strongest.concept.slice(0, 25) + "..." : strongest.concept)
      : "\—";

    return {
      total: connections.length,
      avgStrength: Math.round(avgStrength * 100),
      mostConnected,
      strongestBridge,
    };
  }, [connections]);

  return (
    <div className="conn-stats-row">
      <div className="conn-stat-card">
        <div className="conn-stat-card__value">{stats.total}</div>
        <div className="conn-stat-card__label">Total Concepts</div>
      </div>
      <div className="conn-stat-card">
        <div className="conn-stat-card__value">{stats.avgStrength}%</div>
        <div className="conn-stat-card__label">Avg Strength</div>
      </div>
      <div className="conn-stat-card">
        <div className="conn-stat-card__value">{stats.mostConnected}</div>
        <div className="conn-stat-card__label">Most Connected</div>
      </div>
      <div className="conn-stat-card">
        <div className="conn-stat-card__value">{stats.strongestBridge}</div>
        <div className="conn-stat-card__label">Strongest Bridge</div>
      </div>
    </div>
  );
}
