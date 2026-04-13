import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimiter";
import { buildConnections, getConnections } from "../controllers/connectionsController";
import { generateConnectionDeepDive } from "../services/connectionAiService";
import { connectionDeepDiveSchema } from "../validators/connectionSchemas";
import { emptyBodySchema } from "../validators/routeSchemas";

const router = Router();

router.get("/connections", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const connections = await getConnections(req.user!.userId);
  res.json({ ok: true, connections });
}));

router.post("/connections/build", requireAuth, rateLimiter("ai:connections-build", 5, 60_000), validate(emptyBodySchema), asyncHandler(async (req: AuthRequest, res) => {
  const connections = await buildConnections(req.user!.userId, true);
  res.json({ ok: true, connections });
}));

router.post("/connections/deep-dive", requireAuth, validate(connectionDeepDiveSchema), asyncHandler(async (req, res) => {
  const { concept, lessonTitles, relatedConcepts } = req.body;
  const analysis = await generateConnectionDeepDive(concept, lessonTitles, relatedConcepts);
  res.json({ ok: true, analysis });
}));

export default router;
