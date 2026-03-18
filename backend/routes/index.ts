import { Router } from "express";
import { rateLimiter } from "../middleware/rateLimiter";

import lessonRoutes from "./lessonRoutes";
import uploadRoutes from "./uploadRoutes";
import quizRoutes from "./quizRoutes";
// DISABLED: import weaknessRoutes from "./weaknessRoutes";
import flashcardRoutes from "./flashcardRoutes";
// DISABLED: import sprintRoutes from "./sprintRoutes";
import connectionRoutes from "./connectionRoutes";
import shareRoutes from "./shareRoutes";
// DISABLED: import roomRoutes from "./roomRoutes";
import courseRoutes from "./courseRoutes";
import schedulerRoutes from "./schedulerRoutes";
import notificationRoutes from "./notificationRoutes";
import collabRoutes from "./collabRoutes";
import authRoutes from "./authRoutes";
import roomRoutes2 from "./roomRoutes2";
import gamificationRoutes from "./gamificationRoutes";

const router = Router();

// Health check
router.get("/health", (_req, res) => res.json({ ok: true }));

// Auth
router.use("/api", authRoutes);

// Global rate limit for AI-heavy endpoints (20 req/min per user)
router.use(
  "/api",
  rateLimiter("ai-global", 20, 60_000)
);

// Core lesson & AI routes
router.use("/api", lessonRoutes);

// Upload (transcribe, slides)
router.use("/api", uploadRoutes);

// Quiz
router.use("/api", quizRoutes);

// DISABLED: Weakness tracker
// router.use("/api", weaknessRoutes);

// Flashcards
router.use("/api", flashcardRoutes);

// DISABLED: Sprint / Pomodoro
// router.use("/api", sprintRoutes);

// Cross-lesson connections
router.use("/api", connectionRoutes);

// Share
router.use("/api", shareRoutes);

// DISABLED: Legacy rooms (v1) - replaced by roomRoutes2
// router.use("/api", roomRoutes);

// Courses
router.use("/api", courseRoutes);

// Scheduler
router.use("/api", schedulerRoutes);

// Notifications
router.use("/api", notificationRoutes);

// Collaboration V2 (Discord-style)
router.use("/api/collab", collabRoutes);

// Rooms V2 (Discord-style, /api/rooms/*)
router.use("/api", roomRoutes2);

// Gamification (XP, streak)
router.use("/api", gamificationRoutes);

export default router;
