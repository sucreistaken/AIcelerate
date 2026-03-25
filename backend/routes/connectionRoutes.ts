import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { buildConnections, getConnections } from "../controllers/connectionsController";
import { getModel } from "../services/aiService";
import { generateConnectionDeepDive } from "../services/connectionAiService";
import { connectionDeepDiveSchema } from "../validators/connectionSchemas";

const router = Router();

router.get("/connections", (_req, res) => {
  res.json({ ok: true, connections: getConnections() });
});

router.post("/connections/build", asyncHandler(async (_req, res) => {
  const connections = await buildConnections(getModel());
  res.json({ ok: true, connections });
}));

router.post("/connections/deep-dive", validate(connectionDeepDiveSchema), asyncHandler(async (req, res) => {
  const { concept, lessonTitles, relatedConcepts } = req.body;
  const analysis = await generateConnectionDeepDive(concept, lessonTitles, relatedConcepts);
  res.json({ ok: true, analysis });
}));

export default router;
