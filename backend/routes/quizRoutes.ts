import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import {
  generateQuizFromEmphases,
  getQuizPack,
  scoreQuizPack,
} from "../controllers/quizController";
import { attachQuizPack, setQuizScore } from "../services/lessonDataService";
import { isQuizPack } from "../types";
import { quizGenerateSchema, quizSubmitSchema } from "../validators/routeSchemas";

const router = Router();

router.post("/quiz/generate", requireAuth, validate(quizGenerateSchema), asyncHandler(async (req, res) => {
  const { count, lessonIds, lessonId } = req.body as {
    count?: number;
    lessonIds?: string[];
    lessonId?: string;
  };
  const pack = await generateQuizFromEmphases(count ?? 5, lessonIds);
  if (!isQuizPack(pack)) return res.status(400).json(pack);
  if (lessonId) attachQuizPack(lessonId, pack.id);
  return res.json(pack);
}));

router.get("/quiz/:packId", requireAuth, asyncHandler(async (req, res) => {
  const pack = await getQuizPack(req.params.packId);
  if (!pack) return res.status(404).json({ error: "Not found" });
  res.json(pack);
}));

router.post("/quiz/:packId/submit", requireAuth, validate(quizSubmitSchema), asyncHandler(async (req, res) => {
  const { answers, lessonId } = req.body as {
    answers: Array<{ id: string; answer: string | boolean }>;
    lessonId?: string;
  };
  const result = await scoreQuizPack(req.params.packId, answers || []);
  if (lessonId && typeof result?.score === "number")
    setQuizScore(lessonId, req.params.packId, result.score);
  res.json(result);
}));

export default router;
