import { Router } from "express";
import {
  createShare,
  getShare,
  addComment,
  listShares,
  deleteShare,
} from "../services/shareService";
import { upsertLesson } from "../services/lessonDataService";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { shareCreateSchema, shareCommentSchema, emptyBodySchema } from "../validators/routeSchemas";

const router = Router();

router.post("/shares", requireAuth, validate(shareCreateSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { lessonId } = req.body as { lessonId: string };
  const createdBy = req.user!.userId;
  const share = await createShare(lessonId, createdBy);
  if (!share) return res.status(404).json({ ok: false, error: "Lesson not found" });
  res.status(201).json({ ok: true, share });
}));

router.get("/shares/:shareId", asyncHandler(async (req, res) => {
  const share = await getShare(req.params.shareId);
  if (!share) return res.status(404).json({ ok: false, error: "Share not found or expired" });
  res.json({ ok: true, share });
}));

router.post("/shares/:shareId/comments", requireAuth, validate(shareCommentSchema), asyncHandler(async (req: AuthRequest, res) => {
  const author = req.user!.userId;
  const { text } = req.body as { text: string };
  const share = await addComment(req.params.shareId, author, text);
  if (!share) return res.status(404).json({ ok: false, error: "Share not found" });
  res.json({ ok: true, share });
}));

router.get("/shares", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const shares = await listShares(userId);
  res.json({ ok: true, shares });
}));

router.delete("/shares/:shareId", requireAuth, validate(emptyBodySchema), asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const deleted = await deleteShare(req.params.shareId, userId);
  if (!deleted) return res.status(404).json({ ok: false, error: "Share not found" });
  res.status(204).end();
}));

router.post("/shares/:shareId/import", requireAuth, validate(emptyBodySchema), asyncHandler(async (req, res) => {
  const share = await getShare(req.params.shareId);
  if (!share) return res.status(404).json({ ok: false, error: "Share not found" });
  const newLesson = await upsertLesson({
    title: `[Imported] ${share.bundle.title}`,
    plan: share.bundle.plan,
    cheatSheet: share.bundle.cheatSheet,
    professorEmphases: share.bundle.emphases,
  });
  res.status(201).json({ ok: true, lessonId: newLesson.id, lesson: newLesson });
}));

export default router;
