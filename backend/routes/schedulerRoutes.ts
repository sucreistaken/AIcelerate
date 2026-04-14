import { Router } from "express";
import {
  getNextSession,
  getDailyPlan,
  getWeeklyOverview,
  completeTask as completeSchedulerTask,
  getStreak,
} from "../services/schedulerService";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { schedulerCompleteTaskSchema } from "../validators/routeSchemas";

const router = Router();

router.get("/scheduler/next-session", requireAuth, asyncHandler(async (req, res) => {
  const courseId = req.query.courseId as string | undefined;
  const result = getNextSession(courseId || undefined);
  res.json({ ok: true, ...result });
}));

router.get("/scheduler/daily", requireAuth, asyncHandler(async (req, res) => {
  const courseId = req.query.courseId as string | undefined;
  const plan = await getDailyPlan(courseId || undefined);
  res.json({ ok: true, plan });
}));

router.get("/scheduler/weekly", requireAuth, asyncHandler(async (req, res) => {
  const courseId = req.query.courseId as string | undefined;
  const overview = await getWeeklyOverview(courseId || undefined);
  res.json({ ok: true, overview });
}));

router.post("/scheduler/complete-task", requireAuth, validate(schedulerCompleteTaskSchema), asyncHandler(async (req, res) => {
  const { taskId } = req.body;
  const result = await completeSchedulerTask(taskId);
  res.json(result);
}));

router.get("/scheduler/streak", requireAuth, asyncHandler(async (_req, res) => {
  const streak = await getStreak();
  res.json({ ok: true, streak });
}));

export default router;
