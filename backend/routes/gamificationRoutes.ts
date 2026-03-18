import { Router } from "express";
import { addXp, getStats } from "../controllers/gamificationController";

const router = Router();

router.post("/xp/add", addXp);
router.get("/xp/stats", getStats);

export default router;
