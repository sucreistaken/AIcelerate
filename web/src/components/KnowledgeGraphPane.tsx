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
  concept: "💡", principle: "📐", formula: "🔢", technique: "⚙️", definition: "📖",
};

function NodeCard({ node, edges, onSelect, isSelected }: {
  node: ConceptNode; edges: ConceptEdge[]; onSelect: (id: string) => void; isSelected: boolean;
}) {
  const relatedEdges = edges.filter(e => e.from === node.id || e.to === node.id);

  return (
    <motion.div
      className={`kg__node${isSelected ? " kg__node--selected" : ""}`}
      onClick={() => onSelect(node.id)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="kg__node-top">
        <span className="kg__node-emoji">{NODE_TYPE_ICONS[node.type] || "📌"}</span>
        <span className="kg__node-name">{node.name}</span>
        <Badge variant="soft" size="sm">{node.type}</Badge>
      </div>
      <div className="kg__node-meta">
        <span className="kg__node-lessons">{node.lessonIds.length} ders</span>
        {node.strength > 0.5 && <Badge variant="success" size="sm">Guclu</Badge>}
      </div>
      {isSelected && relatedEdges.length > 0 && (
        <div className="kg__node-edges">
          {relatedEdges.map((edge, i) => {
            const isFrom = edge.from === node.id;
            const other = isFrom ? edge.to : edge.from;
            return (
              <div key={i} className="kg__edge">
                <div className="kg__edge-dot" style={{ backgroundColor: RELATIONSHIP_COLORS[edge.relationship] || "var(--muted)" }} />
                <span>{isFrom ? "→" : "←"} {t(`knowledgeGraph.${edge.relationship}`)} <strong>{other}</strong></span>
                <span className="kg__edge-conf">({Math.round(edge.confidence * 100)}%)</span>
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
    } finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const handleRebuild = async () => {
    if (!courseId) return;
    setRebuilding(true);
    try {
      const res = await knowledgeGraphApi.rebuild(courseId);
      if (res.ok && res.graph) setGraph(res.graph);
    } finally { setRebuilding(false); }
  };

  if (!courseId) return <div className="kg__no-course">Lutfen bir kurs secin.</div>;

  return (
    <motion.div
      className="kg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <PaneInfoBanner
        id="knowledge-graph"
        title={t("knowledgeGraph.title")}
        description="Kavramlar arasindaki iliskileri gorsellestirin. On kosullar, genisletmeler ve uygulamalar."
        tips={["Kavram iliskileri", "Ders bazli guc", "Otomatik cikarim"]}
      />

      <motion.header
        className="kg__header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="kg__header-left">
          <div className="kg__header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="19" r="2"/>
              <line x1="14" y1="10" x2="17.5" y2="6.5"/><line x1="10" y1="10" x2="6.5" y2="6.5"/><line x1="14" y1="14" x2="17.5" y2="17.5"/><line x1="10" y1="14" x2="6.5" y2="17.5"/>
            </svg>
          </div>
          <div>
            <h1 className="kg__title">{t("knowledgeGraph.title")}</h1>
            {graph && (
              <div className="kg__meta">
                <Badge variant="soft" size="sm">{graph.nodes.length} {t("knowledgeGraph.nodes")}</Badge>
                <Badge variant="soft" size="sm">{graph.edges.length} {t("knowledgeGraph.edges")}</Badge>
              </div>
            )}
          </div>
        </div>
        <button className="kg__rebuild-btn" onClick={handleRebuild} disabled={rebuilding}>
          {rebuilding ? <Spinner size="sm" /> : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> {t("knowledgeGraph.rebuild")}</>
          )}
        </button>
      </motion.header>

      {loading && <div className="kg__loading"><Spinner size="lg" /></div>}

      {!loading && !graph && <div className="kg__no-course">{t("knowledgeGraph.empty")}</div>}

      {!loading && graph && graph.nodes.length > 0 && (
        <>
          <div className="kg__legend">
            {Object.entries(RELATIONSHIP_COLORS).map(([rel, color]) => (
              <div key={rel} className="kg__legend-item">
                <div className="kg__legend-dot" style={{ backgroundColor: color }} />
                {t(`knowledgeGraph.${rel}`)}
              </div>
            ))}
          </div>

          <div className="kg__grid">
            {graph.nodes.sort((a, b) => b.strength - a.strength).map(node => (
              <NodeCard key={node.id} node={node} edges={graph.edges} onSelect={setSelectedNode} isSelected={selectedNode === node.id} />
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
