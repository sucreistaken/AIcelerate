import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { extractGraphFromLessons, getKnowledgeGraph } from "../services/knowledgeGraphService";
import { notFound } from "../middleware/errorHandler";

const router = Router();

// Get cached knowledge graph for a course
router.get("/courses/:id/knowledge-graph", (req, res) => {
  const graph = getKnowledgeGraph(req.params.id);
  if (!graph) {
    return res.json({ ok: true, graph: null, message: "No knowledge graph built yet. Use POST to rebuild." });
  }
  res.json({ ok: true, graph });
});

// Rebuild knowledge graph from course lessons
router.post("/courses/:id/knowledge-graph/rebuild", asyncHandler(async (req, res) => {
  const graph = await extractGraphFromLessons(req.params.id);
  res.json({ ok: true, graph });
}));

export default router;
