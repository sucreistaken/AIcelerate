import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";
import { rateLimiter } from "../middleware/rateLimiter";
import { getAiMetrics } from "../services/aiService";
import { listLessons, listLessonsPaginated } from "../services/lessonDataService";
import type { Lesson } from "../services/lessonDataService";
import { listCourses } from "../controllers/courseController";
import { getNextSession, getDailyPlan, getStreak } from "../controllers/schedulerController";
import { getFlashcardStats } from "../controllers/flashcardController";
import { checkAndGenerateNotifications, getUnreadCount } from "../controllers/notificationController";

import lessonRoutes from "./lessonRoutes";
import lessonAiRoutes from "./lessonAiRoutes";
import lessonQuizRoutes from "./lessonQuizRoutes";
import uploadRoutes from "./uploadRoutes";
import quizRoutes from "./quizRoutes";
import flashcardRoutes from "./flashcardRoutes";
import connectionRoutes from "./connectionRoutes";
import shareRoutes from "./shareRoutes";
import courseRoutes from "./courseRoutes";
import schedulerRoutes from "./schedulerRoutes";
import notificationRoutes from "./notificationRoutes";
import collabRoutes from "./collabRoutes";
import authRoutes from "./authRoutes";
import roomRoutes from "./roomRoutes";
import gamificationRoutes from "./gamificationRoutes";
import adminRoutes from "./adminRoutes";
import knowledgeGraphRoutes from "./knowledgeGraphRoutes";
import adaptiveQuizRoutes from "./adaptiveQuizRoutes";
import loProgressRoutes from "./loProgressRoutes";

const router = Router();

// Health check — includes DB + AI status
router.get("/health", (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  res.status(mongoOk ? 200 : 503).json({ ok: mongoOk });
});

// AI metrics endpoint
router.get("/health/ai-metrics", requireAuth, (_req, res) => {
  res.json({ ok: true, data: getAiMetrics() });
});

// Dashboard batch endpoint — replaces 7 separate calls with 1
// All data served from in-memory cache (0 disk I/O)
// ?lite=true strips transcript/slideText (~50-100KB saved per response)
router.get("/api/dashboard/init", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user?.userId;
  const courseId = req.query.courseId as string | undefined;
  const lite = req.query.lite === "true";
  const t0 = performance.now();
  try {
    // Fire-and-forget: don't block the response for notification generation
    if (userId) checkAndGenerateNotifications(userId).catch(() => { /* fire-and-forget */ });

    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 200);
    const cursor = req.query.cursor as string | undefined;
    let lessons: Lesson[];
    try {
      const paginated = listLessonsPaginated(cursor, limit);
      lessons = paginated.items;
    } catch {
      lessons = listLessons().slice(0, limit);
    }
    lessons = lessons.filter((l) => !l.userId || l.userId === userId);
    if (lite) {
      lessons = lessons.map((l) => {
        const { transcript: _transcript, slideText: _slideText, ...meta } = l;
        return meta as Lesson;
      });
    }

    // Parallelize independent async calls
    const [unreadCount, streak, dailyPlan] = await Promise.all([
      userId ? getUnreadCount(userId) : Promise.resolve(0),
      getStreak(),
      getDailyPlan(courseId),
    ]);

    const result = {
      ok: true,
      lessons,
      courses: listCourses().filter((c: { userId?: string }) => !c.userId || c.userId === userId),
      unreadCount,
      scheduler: {
        nextSession: getNextSession(courseId),
        streak,
        dailyPlan,
      },
      flashcardStats: getFlashcardStats(),
      _perf: { ms: +(performance.now() - t0).toFixed(2) },
    };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// Auth
router.use("/api", authRoutes);

// General API rate limit per user (1200 req/min — frontend sends ~15 req per page load,
// normal navigation easily hits 100-200/min. AI/write routes have their own stricter limits)
router.use(
  "/api",
  rateLimiter("api-global", 1200, 60_000)
);

// Core lesson & AI routes
router.use("/api", lessonRoutes);
router.use("/api", lessonAiRoutes);
router.use("/api", lessonQuizRoutes);

// Upload (transcribe, slides)
router.use("/api", uploadRoutes);

// Quiz
router.use("/api", quizRoutes);

// Flashcards
router.use("/api", flashcardRoutes);

// Cross-lesson connections
router.use("/api", connectionRoutes);

// Share
router.use("/api", shareRoutes);

// Courses
router.use("/api", courseRoutes);

// Scheduler
router.use("/api", schedulerRoutes);

// Notifications
router.use("/api", notificationRoutes);

// Collaboration (Discord-style)
router.use("/api/collab", collabRoutes);

// Rooms (/api/rooms/*)
router.use("/api", roomRoutes);

// Gamification (XP, streak)
router.use("/api", gamificationRoutes);

// Admin panel
router.use("/api/admin", adminRoutes);

// Knowledge Graph
router.use("/api", knowledgeGraphRoutes);

// Adaptive Quiz
router.use("/api", adaptiveQuizRoutes);

// LO Progress Dashboard
router.use("/api", loProgressRoutes);

export default router;
