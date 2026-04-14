import { describe, it, expect, vi } from "vitest";

// vi.hoisted runs at the same hoisting level as vi.mock (both are hoisted
// above all other top-level code). This ensures env vars are set before
// config/env.ts is resolved by the mock factory graph.
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

// Mock mongoose connection state for /health
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

// Mock data-layer services so importing routes/index doesn't read real files
vi.mock("../../services/lessonDataService", () => ({
  listLessons: vi.fn(() => []),
  listLessonsPaginated: vi.fn(() => ({ items: [], nextCursor: null, hasMore: false })),
  listLessonsForUser: vi.fn(() => []),
  listLessonsPaginatedForUser: vi.fn(() => ({ items: [], nextCursor: null, hasMore: false })),
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
  listCourses: vi.fn(() => []),
  listCoursesForUser: vi.fn(() => []),
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
vi.mock("../../services/schedulerService", () => ({
  getNextSession: vi.fn(() => ({ task: null, totalPending: 0 })),
  getDailyPlan: vi.fn(() => ({ id: "dp-1", date: "2026-04-11", generatedAt: "", tasks: [], totalEstimatedMinutes: 0, summary: "" })),
  getStreak: vi.fn(() => ({ currentStreak: 0, longestStreak: 0, lastStudyDate: null })),
}));
vi.mock("../../services/flashcardService", () => ({
  getFlashcardStats: vi.fn(() => ({ total: 0, new: 0, learning: 0, review: 0, graduated: 0, dueToday: 0 })),
  getDueCards: vi.fn(() => []),
}));
vi.mock("../../services/notificationService", () => ({
  checkAndGenerateNotifications: vi.fn(() => []),
  getUnreadCount: vi.fn(() => 0),
}));
vi.mock("../../services/aiService", () => ({
  getAiMetrics: vi.fn(() => ({
    totalCalls: 0, successCount: 0, failureCount: 0, fallbackCount: 0,
    totalLatencyMs: 0, avgLatencyMs: 0, uptime: 1,
  })),
  getModel: vi.fn(),
  safeGenerate: vi.fn(),
  getTemperature: vi.fn(() => 0.3),
  stripCodeFences: vi.fn((s: string) => s),
  tryParseJSON: vi.fn((s: string) => { try { return JSON.parse(s); } catch { return null; } }),
  trackAiCall: vi.fn(),
  trackStreamUsage: vi.fn(),
  extractSafeText: vi.fn((r: { text: () => string }) => r?.text?.() ?? ""),
}));

import supertest from "supertest";
import express, { Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import { requestContext } from "../../middleware/requestContext";
import { errorHandler, AppError } from "../../middleware/errorHandler";
import routes from "../../routes/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createApp() {
  const app = express();

  // Compression (same config as server.ts)
  app.use(
    compression({
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) return false;
        return compression.filter(req, res);
      },
    })
  );

  // CORS
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || origin === "http://localhost:5173") cb(null, true);
        else cb(new Error("CORS not allowed"));
      },
      credentials: true,
    })
  );

  // Body parsing + cookies
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  // Request context (requestId)
  app.use(requestContext);

  // ---- Test-only helper routes (mounted before real routes) ----

  // Large body (> 1KB) for compression tests
  app.get("/__test/large-body", (_req: Request, res: Response) => {
    res.json({ data: "x".repeat(2000) });
  });

  // Small body (< 1KB) for compression tests
  app.get("/__test/small-body", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Echoes requestId
  app.get("/__test/echo-request-id", (req: Request, res: Response) => {
    res.json({ requestId: (req as any).requestId });
  });

  // Throws a generic Error (to test production error masking)
  app.get("/__test/internal-error", (_req: Request, _res: Response, next: NextFunction) => {
    next(new Error("secret internal detail"));
  });

  // Throws an AppError
  app.get("/__test/app-error", (_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(422, "Unprocessable", "UNPROCESSABLE_ENTITY"));
  });

  // Accepts a body (for size limit tests)
  app.post("/__test/echo-body", (req: Request, res: Response) => {
    res.json({ received: true, size: JSON.stringify(req.body).length });
  });

  // Application routes
  app.use(routes);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

function authHeader(userId = "test-user") {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: "15m",
  });
  return `Bearer ${token}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Middleware E2E", () => {
  const app = createApp();
  const agent = supertest(app);

  // ── Error handling ──────────────────────────────────────────────────────

  describe("Error handling", () => {
    it("returns structured error for 404 routes", async () => {
      const res = await agent.get("/no-such-route-ever");
      expect(res.status).toBe(404);
    });

    it("returns JSON error for invalid JSON body", async () => {
      const res = await agent
        .post("/__test/echo-body")
        .set("Content-Type", "application/json")
        .send("{bad-json!!!");
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it("includes requestId in error responses", async () => {
      const res = await agent.get("/__test/app-error");
      expect(res.status).toBe(422);
      expect(res.body.requestId).toBeDefined();
      expect(typeof res.body.requestId).toBe("string");
      expect(res.body.requestId.length).toBeGreaterThan(0);
    });

    it("hides internal error details in production mode", async () => {
      const orig = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        const res = await agent.get("/__test/internal-error");
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Internal server error");
        expect(res.body.error).not.toContain("secret internal detail");
      } finally {
        process.env.NODE_ENV = orig;
      }
    });
  });

  // ── Request context ─────────────────────────────────────────────────────

  describe("Request context", () => {
    it("generates unique requestId for each request", async () => {
      const res1 = await agent.get("/__test/echo-request-id");
      const res2 = await agent.get("/__test/echo-request-id");
      expect(res1.body.requestId).toBeDefined();
      expect(res2.body.requestId).toBeDefined();
      expect(res1.body.requestId).not.toBe(res2.body.requestId);
    });

    it("requestId appears in error body", async () => {
      const res = await agent.get("/__test/internal-error");
      expect(res.status).toBe(500);
      expect(res.body.requestId).toBeDefined();
    });
  });

  // ── Compression ─────────────────────────────────────────────────────────

  describe("Compression", () => {
    it("compresses responses larger than 1KB", async () => {
      const res = await agent
        .get("/__test/large-body")
        .set("Accept-Encoding", "gzip, deflate");
      expect(res.status).toBe(200);
      expect(res.headers["content-encoding"]).toMatch(/gzip|deflate/);
    });

    it("skips compression for small responses", async () => {
      const res = await agent
        .get("/__test/small-body")
        .set("Accept-Encoding", "gzip, deflate");
      expect(res.status).toBe(200);
      expect(res.headers["content-encoding"]).toBeUndefined();
    });

    it("skips compression when x-no-compression header set", async () => {
      const res = await agent
        .get("/__test/large-body")
        .set("Accept-Encoding", "gzip, deflate")
        .set("x-no-compression", "true");
      expect(res.status).toBe(200);
      expect(res.headers["content-encoding"]).toBeUndefined();
    });
  });

  // ── Body size limit ─────────────────────────────────────────────────────

  describe("Body size limit", () => {
    it("accepts body under 2MB", async () => {
      const body = { data: "y".repeat(100_000) };
      const res = await agent.post("/__test/echo-body").send(body);
      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });

    it("rejects body over 2MB with 413", async () => {
      const body = { data: "z".repeat(3_000_000) };
      const res = await agent
        .post("/__test/echo-body")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(body));
      expect(res.status).toBe(413);
    });
  });

  // ── CORS ────────────────────────────────────────────────────────────────

  describe("CORS", () => {
    it("allows requests from configured origin", async () => {
      const res = await agent
        .options("/__test/small-body")
        .set("Origin", "http://localhost:5173")
        .set("Access-Control-Request-Method", "GET");
      expect(res.status).toBeLessThan(400);
      expect(res.headers["access-control-allow-origin"]).toBe(
        "http://localhost:5173"
      );
    });
  });
});
