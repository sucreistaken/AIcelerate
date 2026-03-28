import { Router } from "express";
import { rateLimiter } from "../middleware/rateLimiter";

import lessonRoutes from "./lessonRoutes";
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

const router = Router();

// Health check
router.get("/health", (_req, res) => res.json({ ok: true }));

// Auth
router.use("/api", authRoutes);

// General API rate limit (200 req/min per user — generous for reads, AI routes have their own stricter limits)
router.use(
  "/api",
  rateLimiter("api-global", 200, 60_000)
);

// Core lesson & AI routes
router.use("/api", lessonRoutes);

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

export default router;
