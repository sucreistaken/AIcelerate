import { Router } from "express";
import mongoose from "mongoose";
import { rateLimiter } from "../middleware/rateLimiter";
import { getAiMetrics } from "../services/aiService";

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
import adminRoutes from "./adminRoutes";
import knowledgeGraphRoutes from "./knowledgeGraphRoutes";
import adaptiveQuizRoutes from "./adaptiveQuizRoutes";
import loProgressRoutes from "./loProgressRoutes";

const router = Router();

// Health check — includes DB + AI status
router.get("/health", (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const status = mongoOk ? 200 : 503;
  res.status(status).json({
    ok: mongoOk,
    mongo: mongoOk ? "connected" : "disconnected",
    uptime: Math.round(process.uptime()),
  });
});

// AI metrics endpoint
router.get("/health/ai-metrics", (_req, res) => {
  res.json({ ok: true, data: getAiMetrics() });
});

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

// Admin panel
router.use("/api/admin", adminRoutes);

// Knowledge Graph
router.use("/api", knowledgeGraphRoutes);

// Adaptive Quiz
router.use("/api", adaptiveQuizRoutes);

// LO Progress Dashboard
router.use("/api", loProgressRoutes);

export default router;
