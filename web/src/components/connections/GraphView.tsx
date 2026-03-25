import React, { useMemo, useState, useCallback } from "react";
import { ConceptConnection } from "../../types";
import { hashCode } from "./helpers";

type GraphLimit = 20 | 50 | "all";

interface GraphViewProps {
  connections: ConceptConnection[];
  selectedConcept: string | null;
  onSelect: (concept: string) => void;
}

export default function GraphView({ connections, selectedConcept, onSelect }: GraphViewProps) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [showLimit, setShowLimit] = useState<GraphLimit>(20);

  const visibleConnections = useMemo(() => {
    if (showLimit === "all") return connections;
    return connections.slice(0, showLimit);
  }, [connections, showLimit]);

  const { nodes, edges } = useMemo(() => {
    const lessonSet = new Map<string, { x: number; y: number; title: string }>();
    const conceptNodes: Array<{
      concept: string; fullConcept: string; x: number; y: number;
      strength: number; lessonIds: string[];
    }> = [];
    const edgeList: Array<{
      from: { x: number; y: number }; to: { x: number; y: number };
      strength: number; conceptName: string;
    }> = [];

    const allLessons = new Map<string, string>();
    for (const conn of visibleConnections) {
      conn.lessonIds.forEach((id, i) => {
        if (!allLessons.has(id)) allLessons.set(id, conn.lessonTitles[i] || id);
      });
    }

    const lessonArray = Array.from(allLessons.entries());
    const cx = 300, cy = 250, radius = 180;
    lessonArray.forEach(([id, title], i) => {
      const angle = (2 * Math.PI * i) / lessonArray.length - Math.PI / 2;
      lessonSet.set(id, {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        title: title.length > 20 ? title.slice(0, 20) + "..." : title,
      });
    });

    visibleConnections.forEach((conn) => {
      let avgX = cx, avgY = cy;
      if (conn.lessonIds.length > 0) {
        const positions = conn.lessonIds
          .map((id) => lessonSet.get(id))
          .filter(Boolean) as { x: number; y: number }[];
        if (positions.length > 0) {
          avgX = positions.reduce((a, p) => a + p.x, 0) / positions.length;
          avgY = positions.reduce((a, p) => a + p.y, 0) / positions.length;
        }
      }

      const h = hashCode(conn.concept);
      const jitter = 30;
      avgX += ((((h & 0xffff) / 0xffff) * 2) - 1) * jitter;
      avgY += (((((h >> 16) & 0xffff) / 0xffff) * 2) - 1) * jitter;

      conceptNodes.push({
        concept: conn.concept.length > 25 ? conn.concept.slice(0, 25) + "..." : conn.concept,
        fullConcept: conn.concept,
        x: avgX, y: avgY,
        strength: conn.strength,
        lessonIds: conn.lessonIds,
      });

      for (const lid of conn.lessonIds) {
        const lNode = lessonSet.get(lid);
        if (lNode) {
          edgeList.push({
            from: { x: avgX, y: avgY },
            to: { x: lNode.x, y: lNode.y },
            strength: conn.strength,
            conceptName: conn.concept,
          });
        }
      }
    });

    return {
      nodes: { lessons: Array.from(lessonSet.entries()), concepts: conceptNodes },
      edges: edgeList,
    };
  }, [visibleConnections]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform((t) => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.3, Math.min(3, t.scale + delta));
      return { ...t, scale: newScale };
    });
  }, []);

  const zoom = useCallback((delta: number) => {
    setTransform((t) => ({
      ...t,
      scale: Math.max(0.3, Math.min(3, t.scale + delta)),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  if (connections.length === 0) {
    return (
      <div className="pane-empty">
        <div className="pane-empty__icon">G</div>
        <div className="pane-empty__title">No graph data</div>
        <div className="pane-empty__desc">Build connections first to see the graph.</div>
      </div>
    );
  }

  return (
    <div className="conn-graph-wrap" style={{ position: "relative" }}>
      <div className="conn-graph-controls">
        <button className="btn btn--sm" onClick={() => zoom(0.2)}>+</button>
        <button className="btn btn--sm" onClick={() => zoom(-0.2)}>-</button>
        <button className="btn btn--sm" onClick={resetZoom}>Reset</button>
        <select
          className="conn-search-input"
          value={String(showLimit)}
          onChange={(e) => setShowLimit(e.target.value === "all" ? "all" : Number(e.target.value) as 20 | 50)}
          style={{ width: 80, padding: "3px 6px", fontSize: 11 }}
        >
          <option value="20">Top 20</option>
          <option value="50">Top 50</option>
          <option value="all">All</option>
        </select>
      </div>

      <svg
        width="600" height="500" viewBox="0 0 600 500"
        style={{ width: "100%", maxWidth: 600 }}
        onWheel={handleWheel}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {edges.map((e, i) => {
            const isSelected = selectedConcept === e.conceptName;
            const anySelected = selectedConcept !== null;
            return (
              <line
                key={`e-${i}`}
                x1={e.from.x} y1={e.from.y}
                x2={e.to.x} y2={e.to.y}
                stroke={isSelected ? "var(--accent-2)" : "var(--border)"}
                strokeWidth={1 + e.strength * 2}
                opacity={anySelected ? (isSelected ? 0.9 : 0.15) : 0.3 + e.strength * 0.4}
                style={{ transition: "opacity 0.2s ease, stroke 0.2s ease" }}
              />
            );
          })}

          {nodes.lessons.map(([id, node]) => (
            <g key={`l-${id}`}>
              <circle
                cx={node.x} cy={node.y} r={22}
                fill="var(--accent-2)"
                opacity={hoveredNode === id ? 1 : 0.85}
                stroke={hoveredNode === id ? "var(--text)" : "none"}
                strokeWidth={2}
                onMouseEnter={() => setHoveredNode(id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: "pointer", transition: "opacity 0.15s ease" }}
              />
              <text
                x={node.x} y={node.y + 34}
                textAnchor="middle" fill="var(--text)"
                fontSize={10} fontWeight={600}
                style={{ pointerEvents: "none" }}
              >
                {node.title}
              </text>
            </g>
          ))}

          {nodes.concepts.map((n, i) => {
            const isSelected = selectedConcept === n.fullConcept;
            return (
              <g key={`c-${i}`}>
                <circle
                  cx={n.x} cy={n.y}
                  r={5 + n.strength * 8}
                  fill={isSelected ? "var(--accent-2)" : "var(--warning)"}
                  opacity={isSelected ? 1 : 0.6 + n.strength * 0.4}
                  stroke={isSelected ? "var(--text)" : "none"}
                  strokeWidth={2}
                  style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                  onClick={() => onSelect(n.fullConcept)}
                  onMouseEnter={(e) => {
                    setHoveredNode(n.fullConcept);
                    const rect = (e.target as SVGElement).closest("svg")?.getBoundingClientRect();
                    if (rect) {
                      let tx = e.clientX - rect.left;
                      let ty = e.clientY - rect.top - 30;
                      const tooltipW = 220;
                      const tooltipH = 30;
                      if (tx + tooltipW > rect.width) tx = rect.width - tooltipW - 8;
                      if (tx < 8) tx = 8;
                      if (ty < 8) ty = e.clientY - rect.top + 15;
                      if (ty + tooltipH > rect.height) ty = rect.height - tooltipH - 8;
                      setTooltip({
                        x: tx,
                        y: ty,
                        text: `${n.fullConcept} | ${Math.round(n.strength * 100)}% | ${n.lessonIds.length} lesson(s)`,
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredNode(null);
                    setTooltip(null);
                  }}
                />
                <text
                  x={n.x} y={n.y - 10 - n.strength * 4}
                  textAnchor="middle" fill="var(--muted)"
                  fontSize={9} fontWeight={500}
                  style={{ pointerEvents: "none" }}
                >
                  {n.concept}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {tooltip && (
        <div
          className="conn-graph-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
