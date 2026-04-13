import { describe, it, expect, vi } from "vitest";

// vi.hoisted runs before vi.mock hoisting, so env vars are available
// when any module-level code (e.g. config/env.ts requireEnv) executes.
vi.hoisted(() => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || "e2e-test-secret-key-32-chars-long!!";
  process.env.MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/test";
  process.env.NODE_ENV = "test";
});

// Mock database
vi.mock("../../config/database", () => ({ connectDB: vi.fn() }));

// Mock mongoose connection state so /health reports ok
vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  return {
    ...(actual as any),
    default: {
      ...(actual as any).default,
      connection: { readyState: 1 },
      connect: vi.fn(),
    },
  };
});

// Mock data-layer services used by routes/index.ts and controllers
vi.mock("../../services/lessonDataService", () => ({
  listLessons: vi.fn(() => [
    { id: "l-1", title: "Lesson 1", userId: "test-user-id", transcript: "long text", slideText: "slides" },
    { id: "l-2", title: "Lesson 2", userId: "other-user" },
  ]),
  listLessonsPaginated: vi.fn(() => ({
    items: [
      { id: "l-1", title: "Lesson 1", userId: "test-user-id", transcript: "long text", slideText: "slides" },
      { id: "l-2", title: "Lesson 2", userId: "other-user" },
    ],
    nextCursor: null,
    hasMore: false,
  })),
  listLessonsForUser: vi.fn((userId: string) => {
    const all = [
      { id: "l-1", title: "Lesson 1", userId: "test-user-id", transcript: "long text", slideText: "slides" },
      { id: "l-2", title: "Lesson 2", userId: "other-user" },
    ];
    return all.filter((l) => !l.userId || l.userId === userId);
  }),
  listLessonsPaginatedForUser: vi.fn(() => ({
    items: [
      { id: "l-1", title: "Lesson 1", userId: "test-user-id", transcript: "long text", slideText: "slides" },
    ],
    nextCursor: null,
    hasMore: false,
  })),
  getLesson: vi.fn(),
  upsertLesson: vi.fn(),
  updateProgress: vi.fn(),
  deleteLesson: vi.fn(),
  getMemory: vi.fn().mockResolvedValue({ recurringConcepts: [], recentEmphases: [], lastUpdated: "" }),
  getLessons: vi.fn(() => []),
  addLesson: vi.fn(),
  attachQuizPack: vi.fn(),
  setQuizScore: vi.fn(),
}));

vi.mock("../../services/courseDataService", () => ({
  listCourses: vi.fn(() => [
    { id: "c-1", name: "Course 1", userId: "test-user-id" },
  ]),
  listCoursesForUser: vi.fn((userId: string) => {
    const all = [{ id: "c-1", name: "Course 1", userId: "test-user-id" }];
    return all.filter((c) => !c.userId || c.userId === userId);
  }),
  getCourseForUser: vi.fn(),
  getCourse: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  deleteCourse: vi.fn(),
  addLessonToCourse: vi.fn(),
  removeLessonFromCourse: vi.fn(),
  getCourseLessons: vi.fn(() => []),
  getCourseForLesson: vi.fn(),
  migrateOrphanLessons: vi.fn(),
  rebuildKnowledgeIndex: vi.fn(),
  getCourseProgress: vi.fn(),
  exportCourseData: vi.fn(),
}));

vi.mock("../../services/courseAiService", () => ({
  generateCourseChatResponse: vi.fn(),
  generateStudySchedule: vi.fn(),
}));

vi.mock("../../controllers/schedulerController", () => ({
  getNextSession: vi.fn(() => ({ task: null, totalPending: 0 })),
  getDailyPlan: vi.fn(() => ({
    id: "dp-1",
    date: "2026-04-11",
    generatedAt: "2026-04-11T00:00:00Z",
    tasks: [],
    totalEstimatedMinutes: 0,
    summary: "No tasks",
  })),
  getStreak: vi.fn(() => ({ currentStreak: 3, longestStreak: 7, lastStudyDate: "2026-04-10" })),
}));

vi.mock("../../controllers/flashcardController", () => ({
  getFlashcardStats: vi.fn(() => ({
    total: 10,
    new: 2,
    learning: 3,
    review: 4,
    graduated: 1,
    dueToday: 5,
  })),
  getDueCards: vi.fn(() => []),
}));

vi.mock("../../controllers/notificationController", () => ({
  checkAndGenerateNotifications: vi.fn(() => Promise.resolve([])),
  getUnreadCount: vi.fn(() => 3),
}));

vi.mock("../../services/aiService", () => ({
  getAiMetrics: vi.fn(() => ({
    totalCalls: 42,
    successCount: 40,
    failureCount: 2,
    fallbackCount: 1,
    totalLatencyMs: 12000,
    avgLatencyMs: 286,
    cacheHits: 5,
    cacheSize: 3,
    uptime: 600,
  })),
  getModel: vi.fn(),
  safeGenerate: vi.fn(),
  cachedGenerate: vi.fn(),
  getTemperature: vi.fn(() => 0.3),
  stripCodeFences: vi.fn((s: string) => s),
  trackAiCall: vi.fn(),
}));

import supertest from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { requestContext } from "../../middleware/requestContext";
import { errorHandler } from "../../middleware/errorHandler";
import routes from "../../routes/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(requestContext);
  app.use(routes);
  app.use(errorHandler);
  return app;
}

function authHeader(userId = "test-user-id") {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: "15m",
  });
  return `Bearer ${token}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Health & Dashboard E2E", () => {
  const app = createApp();
  const agent = supertest(app);

  // ── GET /health ────────────────────────────────────────────────────────

  describe("GET /health", () => {
    it("returns minimal health status (no sensitive info)", async () => {
      const res = await agent.get("/health");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it("response only contains ok field", async () => {
      const res = await agent.get("/health");
      const keys = Object.keys(res.body);
      expect(keys).toEqual(["ok"]);
    });

    it("does not expose mongo status details", async () => {
      const res = await agent.get("/health");
      expect(res.body.mongo).toBeUndefined();
      expect(res.body.mongoStatus).toBeUndefined();
      expect(res.body.database).toBeUndefined();
      expect(res.body.db).toBeUndefined();
    });

    it("does not expose uptime", async () => {
      const res = await agent.get("/health");
      expect(res.body.uptime).toBeUndefined();
    });
  });

  // ── GET /health/ai-metrics ─────────────────────────────────────────────

  describe("GET /health/ai-metrics", () => {
    it("returns 401 without auth", async () => {
      const res = await agent.get("/health/ai-metrics");
      expect(res.status).toBe(401);
    });

    it("returns metrics with valid auth", async () => {
      const res = await agent
        .get("/health/ai-metrics")
        .set("Authorization", authHeader());
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.totalCalls).toBe(42);
      expect(res.body.data.avgLatencyMs).toBe(286);
    });
  });

  // ── GET /api/dashboard/init ────────────────────────────────────────────

  describe("GET /api/dashboard/init", () => {
    it("returns 401 without auth", async () => {
      const res = await agent.get("/api/dashboard/init");
      expect(res.status).toBe(401);
    });

    it("returns dashboard data with auth", async () => {
      const res = await agent
        .get("/api/dashboard/init")
        .set("Authorization", authHeader());
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // Lessons should be filtered to the authenticated user
      expect(res.body.lessons).toBeDefined();
      expect(Array.isArray(res.body.lessons)).toBe(true);
      // Courses
      expect(res.body.courses).toBeDefined();
      expect(Array.isArray(res.body.courses)).toBe(true);
      // Scheduler
      expect(res.body.scheduler).toBeDefined();
      expect(res.body.scheduler.nextSession).toBeDefined();
      expect(res.body.scheduler.streak).toBeDefined();
      expect(res.body.scheduler.dailyPlan).toBeDefined();
      // Flashcard stats
      expect(res.body.flashcardStats).toBeDefined();
      expect(res.body.flashcardStats.total).toBe(10);
      // Unread count
      expect(res.body.unreadCount).toBe(3);
    });

    it("respects lite=true to strip heavy fields", async () => {
      const res = await agent
        .get("/api/dashboard/init?lite=true")
        .set("Authorization", authHeader());
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // In lite mode, lessons should NOT contain transcript or slideText
      for (const lesson of res.body.lessons) {
        expect(lesson.transcript).toBeUndefined();
        expect(lesson.slideText).toBeUndefined();
      }
    });

    it("includes performance timing", async () => {
      const res = await agent
        .get("/api/dashboard/init")
        .set("Authorization", authHeader());
      expect(res.status).toBe(200);
      expect(res.body._perf).toBeDefined();
      expect(typeof res.body._perf.ms).toBe("number");
      expect(res.body._perf.ms).toBeGreaterThanOrEqual(0);
    });
  });
});
