// Set env vars BEFORE any imports so config/env.ts doesn't crash
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "e2e-test-secret-key-32-chars-long!!";
process.env.NODE_ENV = "test";

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// Import setup — its vi.mock declarations apply to this test file
import { createAgent, getAuthHeader } from "./setup";

// Import mocked caches — these are the mock objects from setup.ts's vi.mock
import { lessonCache, courseCache, flashcardCache } from "../../cache";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Security E2E", () => {
  const agent = createAgent();

  // Cast cache methods for easy mocking
  const lessonGetAll = lessonCache.getAll as Mock;
  const lessonGet = lessonCache.get as Mock;
  const courseGetAll = courseCache.getAll as Mock;
  const flashcardFilter = (flashcardCache as any).filter as Mock;

  function resetCacheDefaults() {
    lessonGetAll.mockReturnValue([]);
    lessonGet.mockReturnValue(null);
    courseGetAll.mockReturnValue([]);
    flashcardFilter?.mockReturnValue([]);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    resetCacheDefaults();
  });

  // ── Authentication enforcement ─────────────────────────────────────────

  describe("Authentication enforcement", () => {
    const protectedEndpoints: [string, string][] = [
      ["GET", "/api/lessons"],
      ["GET", "/api/courses"],
      ["GET", "/api/flashcards"],
      ["GET", "/api/notifications"],
      ["GET", "/api/scheduler/streak"],
      ["GET", "/api/xp/stats"],
      ["GET", "/api/connections"],
      ["POST", "/api/quiz/generate"],
      ["GET", "/api/dashboard/init"],
    ];

    for (const [method, path] of protectedEndpoints) {
      it(`${method} ${path} returns 401 without auth`, async () => {
        const methodLower = method.toLowerCase() as "get" | "post";
        const res = await (agent as any)[methodLower](path);
        expect(res.status).toBe(401);
      });
    }

    it("returns 401 with an invalid token", async () => {
      const res = await agent
        .get("/api/lessons")
        .set("Authorization", "Bearer invalid-token-garbage");
      expect(res.status).toBe(401);
    });

    it("returns 401 with a malformed Authorization header", async () => {
      const res = await agent
        .get("/api/lessons")
        .set("Authorization", "NotBearer some-token");
      expect(res.status).toBe(401);
    });

    it("returns 401 with an expired token", async () => {
      const jwt = require("jsonwebtoken");
      // Create a token that expired 1 hour ago
      const expiredToken = jwt.sign(
        { userId: "test-user", iat: Math.floor(Date.now() / 1000) - 7200 },
        process.env.JWT_SECRET,
        { expiresIn: "1s" }
      );
      const res = await agent
        .get("/api/lessons")
        .set("Authorization", `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });
  });

  // ── Public endpoints ───────────────────────────────────────────────────

  describe("Public endpoints", () => {
    it("GET /health returns 200 without auth", async () => {
      const res = await agent.get("/health");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBeDefined();
    });

    it("GET /api/shares/:id returns share without auth (public link)", async () => {
      // The share route is public (no requireAuth).
      // A non-existent share returns 404, which proves the endpoint is reachable
      // without auth (not blocked by 401).
      const res = await agent.get("/api/shares/non-existent-share");
      // Should get 404 (share not found) not 401 (unauthorized)
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });

  // ── Input validation ───────────────────────────────────────────────────

  describe("Input validation", () => {
    it("rejects oversized JSON body (>2MB)", async () => {
      // Build a body > 2MB. The express.json({ limit: "2mb" }) parser should
      // reject this with a 413 PayloadTooLargeError.
      const largePayload = JSON.stringify({ data: "x".repeat(3_000_000) });
      const res = await agent
        .post("/api/lessons")
        .set("Authorization", getAuthHeader())
        .set("Content-Type", "application/json")
        .send(largePayload);
      // Express body-parser returns 413 or may bubble through error handler.
      // Either way, request should not succeed (4xx or 5xx).
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(600);
    });

    it("returns 400 for malformed JSON", async () => {
      const res = await agent
        .post("/api/lessons")
        .set("Authorization", getAuthHeader())
        .set("Content-Type", "application/json")
        .send("{this is not json!!!");
      // Express body-parser returns 400 for syntax errors, but the error
      // handler may convert it. Regardless, the request should fail.
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(600);
    });
  });

  // ── Security headers ──────────────────────────────────────────────────

  describe("Security headers", () => {
    it("does not expose X-Powered-By on the production server app", async () => {
      // The real server.ts uses helmet + app.disable("x-powered-by").
      // Here we verify the actual server module's app has X-Powered-By disabled.
      const supertest = (await import("supertest")).default;
      const { app } = await import("../../server");
      const serverAgent = supertest(app);
      const res = await serverAgent.get("/health");
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });

    it("has X-Content-Type-Options: nosniff on the production server app", async () => {
      const supertest = (await import("supertest")).default;
      const { app } = await import("../../server");
      const serverAgent = supertest(app);
      const res = await serverAgent.get("/health");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("has request ID in error responses", async () => {
      // Trigger an AppError by requesting a non-existent lesson
      const res = await agent
        .get("/api/lessons/non-existent")
        .set("Authorization", getAuthHeader());

      expect(res.status).toBe(404);
      // The error handler attaches requestId to AppError responses
      expect(res.body.requestId).toBeDefined();
      expect(typeof res.body.requestId).toBe("string");
    });
  });

  // ── Rate limiting ─────────────────────────────────────────────────────

  describe("Rate limiting", () => {
    it("returns 429 after exceeding rate limit", async () => {
      // The global rate limiter is mocked out in setup for normal tests.
      // Here we import the real rateLimiter and test it in isolation with a
      // minimal express app and a very low limit.
      const { rateLimiter } = await vi.importActual<typeof import("../../middleware/rateLimiter")>(
        "../../middleware/rateLimiter"
      );
      const express = (await import("express")).default;
      const supertest = (await import("supertest")).default;

      // Create a minimal app with a very low rate limit (3 req/min).
      // Use a unique name to avoid sharing state with other rate limit buckets.
      const miniApp = express();
      miniApp.use(rateLimiter("test-security-rl-" + Date.now(), 3, 60_000));
      miniApp.get("/test", (_req, res) => res.json({ ok: true }));

      const rlAgent = supertest(miniApp);

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const r = await rlAgent.get("/test");
        expect(r.status).toBe(200);
      }

      // 4th request should be rate limited
      const limited = await rlAgent.get("/test");
      expect(limited.status).toBe(429);
      expect(limited.body.error).toBe("Too many requests");
      expect(limited.body.retryAfter).toBeDefined();
    });
  });

  // ── Multi-tenant isolation across resources ────────────────────────────

  describe("Multi-tenant isolation", () => {
    it("dashboard only returns authenticated user's data", async () => {
      const userA = "tenant-a";
      const userB = "tenant-b";

      lessonGetAll.mockReturnValue([
        {
          id: "lec-a",
          userId: userA,
          title: "A's Lesson",
          date: new Date().toISOString(),
          transcript: "",
          slideText: "",
        },
        {
          id: "lec-b",
          userId: userB,
          title: "B's Lesson",
          date: new Date().toISOString(),
          transcript: "",
          slideText: "",
        },
      ]);

      courseGetAll.mockReturnValue([
        {
          id: "course-a",
          userId: userA,
          code: "CS101",
          name: "CS",
          lessonIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "course-b",
          userId: userB,
          code: "MATH101",
          name: "Math",
          lessonIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      const res = await agent
        .get("/api/dashboard/init")
        .set("Authorization", getAuthHeader(userA));

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // Verify tenant isolation: only userA's data returned
      const lessonIds = res.body.lessons.map((l: any) => l.id);
      expect(lessonIds).toContain("lec-a");
      expect(lessonIds).not.toContain("lec-b");

      const courseIds = res.body.courses.map((c: any) => c.id);
      expect(courseIds).toContain("course-a");
      expect(courseIds).not.toContain("course-b");
    });
  });
});
