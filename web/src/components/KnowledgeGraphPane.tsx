import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { knowledgeGraphApi } from "../services/api";
import { useCourseStore } from "../stores/courseStore";
import { t } from "../utils/i18n";
import { Badge } from "./ui/Badge";
import { Spinner } from "./ui/Spinner";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import type { KnowledgeGraph, ConceptNode, ConceptEdge } from "../types";

const RELATIONSHIP_COLORS: Record<string, string> = {
  prerequisite: "var(--danger)",
  extends: "var(--accent-2)",
  applies: "var(--success)",
  example_of: "var(--warning)",
};

const NODE_TYPE_ICONS: Record<string, string> = {
  concept: "💡",
  principle: "📐",
  formula: "🔢",
  technique: "⚙️",
  definition: "📖",
};

function NodeCard({ node, edges, onSelect, isSelected }: {
  node: ConceptNode;
  edges: ConceptEdge[];
  onSelect: (id: string) => void;
  isSelected: boolean;
}) {
  const relatedEdges = edges.filter(e => e.from === node.id || e.to === node.id);

  return (
    <motion.div
      className={`lc-card lc-card--outlined lc-card--pad-sm ${isSelected ? "lc-card--hoverable" : ""}`}
      style={{
        cursor: "pointer",
        borderColor: isSelected ? "var(--accent-2)" : undefined,
        backgroundColor: isSelected ? "var(--accent-2-soft)" : undefined,
      }}
      onClick={() => onSelect(node.id)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{NODE_TYPE_ICONS[node.type] || "📌"}</span>
        <span style={{ fontWeight: 600, fontSize: "var(--text-base)", color: "var(--text)" }}>
          {node.name}
        </span>
        <Badge variant="soft" size="sm">{node.type}</Badge>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
          {node.lessonIds.length} ders
        </span>
        {node.strength > 0.5 && (
          <Badge variant="success" size="sm">Güçlü</Badge>
        )}
      </div>
      {isSelected && relatedEdges.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {relatedEdges.map((edge, i) => {
            const isFrom = edge.from === node.id;
            const other = isFrom ? edge.to : edge.from;
            return (
              <div key={i} style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: RELATIONSHIP_COLORS[edge.relationship] || "var(--muted)", flexShrink: 0 }} />
                <span>{isFrom ? "→" : "←"} {t(`knowledgeGraph.${edge.relationship}`)} <strong>{other}</strong></span>
                <span style={{ color: "var(--muted)" }}>({Math.round(edge.confidence * 100)}%)</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default function KnowledgeGraphPane() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const courseId = useCourseStore(s => s.currentCourseId);

  const fetchGraph = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await knowledgeGraphApi.get(courseId);
      if (res.ok && res.graph) setGraph(res.graph);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const handleRebuild = async () => {
    if (!courseId) return;
    setRebuilding(true);
    try {
      const res = await knowledgeGraphApi.rebuild(courseId);
      if (res.ok && res.graph) setGraph(res.graph);
    } finally {
      setRebuilding(false);
    }
  };

  if (!courseId) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Lütfen bir kurs seçin.</div>;
  }

  return (
    <div className="grid-gap-16">
      <PaneInfoBanner
        id="knowledge-graph"
        title={t("knowledgeGraph.title")}
        description="Kavramlar arasındaki ilişkileri görselleştirin. Ön koşullar, genişletmeler ve uygulamalar."
        tips={["Kavram ilişkileri", "Ders bazlı güç", "Otomatik çıkarım"]}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {graph && (
            <>
              <Badge variant="soft" size="md">{graph.nodes.length} {t("knowledgeGraph.nodes")}</Badge>
              <Badge variant="soft" size="md">{graph.edges.length} {t("knowledgeGraph.edges")}</Badge>
            </>
          )}
        </div>
        <button
          className="lc-button lc-button--secondary lc-button--sm"
          onClick={handleRebuild}
          disabled={rebuilding}
        >
          {rebuilding ? <Spinner size="sm" /> : t("knowledgeGraph.rebuild")}
        </button>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40 }}><Spinner size="lg" /></div>}

      {!loading && !graph && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
          {t("knowledgeGraph.empty")}
        </div>
      )}

      {!loading && graph && graph.nodes.length > 0 && (
        <>
          {/* Relationship legend */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "var(--text-xs)", color: "var(--muted)" }}>
            {Object.entries(RELATIONSHIP_COLORS).map(([rel, color]) => (
              <div key={rel} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color }} />
                {t(`knowledgeGraph.${rel}`)}
              </div>
            ))}
          </div>

          {/* Node grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {graph.nodes
              .sort((a, b) => b.strength - a.strength)
              .map(node => (
                <NodeCard
                  key={node.id}
                  node={node}
                  edges={graph.edges}
                  onSelect={setSelectedNode}
                  isSelected={selectedNode === node.id}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
