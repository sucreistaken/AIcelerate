// Set env vars BEFORE any imports so config/env.ts doesn't crash
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "e2e-test-secret-key-32-chars-long!!";
process.env.NODE_ENV = "test";

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// Import setup — its vi.mock declarations apply to this test file
import { createAgent, getAuthHeader } from "./setup";

// Import mocked caches — these are the mock objects from setup.ts's vi.mock
import { lessonCache, courseCache } from "../../cache";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const USER_A = "user-a";
const USER_B = "user-b";

function makeLessonData(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? `lec-${Date.now()}`,
    userId: overrides.userId ?? USER_A,
    title: overrides.title ?? "Test Lesson",
    date: new Date().toISOString(),
    transcript: overrides.transcript ?? "some transcript",
    slideText: overrides.slideText ?? "",
    highlights: [],
    professorEmphases: [],
    quiz: [],
    quizPacks: [],
    progress: { lastMode: "alignment", percent: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Cast cache methods to Mock type for easy access
const getAll = lessonCache.getAll as Mock;
const getOne = lessonCache.get as Mock;
const setOne = lessonCache.set as Mock;
const delOne = lessonCache.delete as Mock;
const courseFindFn = (courseCache as any).find as Mock;
const courseGetAll = courseCache.getAll as Mock;

/** Reset mock defaults after clearAllMocks wipes return values */
function resetCacheDefaults() {
  getAll.mockReturnValue([]);
  getOne.mockReturnValue(null);
  delOne.mockReturnValue(false);
  courseFindFn?.mockReturnValue(null);
  courseGetAll.mockReturnValue([]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Lessons E2E", () => {
  const agent = createAgent();

  beforeEach(() => {
    vi.clearAllMocks();
    resetCacheDefaults();
  });

  // ── GET /api/lessons ────────────────────────────────────────────────────

  describe("GET /api/lessons", () => {
    it("returns 401 without auth", async () => {
      const res = await agent.get("/api/lessons");
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("returns lessons for authenticated user", async () => {
      const lessonA = makeLessonData({ id: "lec-1", userId: USER_A });
      getAll.mockReturnValue([lessonA]);

      const res = await agent
        .get("/api/lessons")
        .set("Authorization", getAuthHeader(USER_A));

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.lessons)).toBe(true);
      expect(res.body.lessons).toHaveLength(1);
      expect(res.body.lessons[0].id).toBe("lec-1");
    });

    it("filters lessons by userId (multi-tenant)", async () => {
      const lessonA = makeLessonData({ id: "lec-a", userId: USER_A });
      const lessonB = makeLessonData({ id: "lec-b", userId: USER_B });
      getAll.mockReturnValue([lessonA, lessonB]);

      const res = await agent
        .get("/api/lessons")
        .set("Authorization", getAuthHeader(USER_A));

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      const ids = res.body.lessons.map((l: any) => l.id);
      expect(ids).toContain("lec-a");
      expect(ids).not.toContain("lec-b");
    });

    it("supports pagination with cursor and limit", async () => {
      const lessons = Array.from({ length: 5 }, (_, i) =>
        makeLessonData({ id: `lec-${i}`, userId: USER_A })
      );
      getAll.mockReturnValue(lessons);

      const res = await agent
        .get("/api/lessons?cursor=lec-1&limit=2")
        .set("Authorization", getAuthHeader(USER_A));

      expect(res.status).toBe(200);
      // Paginated response has items, nextCursor, hasMore
      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBeLessThanOrEqual(2);
    });
  });

  // ── GET /api/lessons/:id ────────────────────────────────────────────────

  describe("GET /api/lessons/:id", () => {
    it("returns 404 for non-existent lesson", async () => {
      const res = await agent
        .get("/api/lessons/does-not-exist")
        .set("Authorization", getAuthHeader(USER_A));

      expect(res.status).toBe(404);
    });

    it("returns lesson for owner", async () => {
      const lesson = makeLessonData({ id: "lec-mine", userId: USER_A });
      getOne.mockReturnValue(lesson);

      const res = await agent
        .get("/api/lessons/lec-mine")
        .set("Authorization", getAuthHeader(USER_A));

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.lesson.id).toBe("lec-mine");
      expect(res.body.lesson.title).toBe("Test Lesson");
    });

    it("returns 404 for other user's lesson (multi-tenant)", async () => {
      const lesson = makeLessonData({ id: "lec-theirs", userId: USER_B });
      getOne.mockReturnValue(lesson);

      const res = await agent
        .get("/api/lessons/lec-theirs")
        .set("Authorization", getAuthHeader(USER_A));

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/lessons ──────────────────────────────────────────────────

  describe("POST /api/lessons", () => {
    it("creates lesson with userId attached", async () => {
      const res = await agent
        .post("/api/lessons")
        .set("Authorization", getAuthHeader(USER_A))
        .send({ title: "New Lesson", transcript: "Hello" });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.lesson).toBeDefined();
      expect(res.body.lesson.title).toBe("New Lesson");
      expect(res.body.lesson.id).toBeDefined();
      // The upsertLesson controller was called and stored a lesson via cache
      expect(setOne).toHaveBeenCalled();
    });

    it("returns 400 for invalid body", async () => {
      // upsertLessonSchema uses passthrough, so most objects pass validation.
      // Sending an array instead of an object triggers a Zod validation error.
      const res = await agent
        .post("/api/lessons")
        .set("Authorization", getAuthHeader(USER_A))
        .send([1, 2, 3]);

      expect(res.status).toBe(400);
    });
  });

  // ── DELETE /api/lessons/:id ────────────────────────────────────────────

  describe("DELETE /api/lessons/:id", () => {
    it("deletes own lesson", async () => {
      const lesson = makeLessonData({ id: "lec-del", userId: USER_A });
      getOne.mockReturnValue(lesson);
      delOne.mockReturnValue(true);
      courseFindFn?.mockReturnValue(null);

      const res = await agent
        .delete("/api/lessons/lec-del")
        .set("Authorization", getAuthHeader(USER_A));

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.deleted).toBe("lec-del");
    });

    it("returns 404 when deleting other user's lesson", async () => {
      const lesson = makeLessonData({ id: "lec-other", userId: USER_B });
      getOne.mockReturnValue(lesson);

      const res = await agent
        .delete("/api/lessons/lec-other")
        .set("Authorization", getAuthHeader(USER_A));

      expect(res.status).toBe(404);
    });
  });
});
