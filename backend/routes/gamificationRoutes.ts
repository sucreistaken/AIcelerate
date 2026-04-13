import { Router } from "express";
import { addXp, getStats } from "../controllers/gamificationController";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { xpAddSchema } from "../validators/routeSchemas";

const router = Router();

router.post("/xp/add", requireAuth, validate(xpAddSchema), addXp);
router.get("/xp/stats", requireAuth, getStats);

export default router;
