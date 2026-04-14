import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: "test-user-id" };
    next();
  },
  AuthRequest: {},
}));

// Mock service functions that the controller calls internally
const mockListLessonsForUser = vi.fn();
const mockListLessonsPaginatedForUser = vi.fn();
const mockGetLesson = vi.fn();
const mockUpsertLesson = vi.fn();
const mockUpdateProgress = vi.fn();
const mockDeleteLesson = vi.fn();
const mockGetMemory = vi.fn();

vi.mock("../../services/lessonDataService", () => ({
  listLessonsForUser: (...args: any[]) => mockListLessonsForUser(...args),
  listLessonsPaginatedForUser: (...args: any[]) => mockListLessonsPaginatedForUser(...args),
  getLesson: (...args: any[]) => mockGetLesson(...args),
  upsertLesson: (...args: any[]) => mockUpsertLesson(...args),
  updateProgress: (...args: any[]) => mockUpdateProgress(...args),
  deleteLesson: (...args: any[]) => mockDeleteLesson(...args),
  getMemory: (...args: any[]) => mockGetMemory(...args),
  // Re-exports used by the controller module
  listLessons: vi.fn(),
  listLessonsPaginated: vi.fn(),
  getLessons: vi.fn(),
  addLesson: vi.fn(),
  attachQuizPack: vi.fn(),
  setQuizScore: vi.fn(),
}));

const mockGetCourseForLesson = vi.fn();
const mockRemoveLessonFromCourse = vi.fn();
const mockRebuildKnowledgeIndex = vi.fn();

vi.mock("../../services/courseDataService", () => ({
  getCourseForLesson: (...args: any[]) => mockGetCourseForLesson(...args),
  removeLessonFromCourse: (...args: any[]) => mockRemoveLessonFromCourse(...args),
  rebuildKnowledgeIndex: (...args: any[]) => mockRebuildKnowledgeIndex(...args),
}));

vi.mock("../../services/contextAssemblerService", () => ({
  assembleCourseContext: vi.fn(),
}));

vi.mock("../../services/loModuleService", () => ({
  hasAlignment: vi.fn(),
  generateAlignmentOnly: vi.fn(),
  generateLoAlignmentForLesson: vi.fn(),
  generateLoModules: vi.fn(),
}));

vi.mock("../../services/cheatSheetService", () => ({
  generateCheatSheet: vi.fn(),
}));

vi.mock("../../services/lessonDigestService", () => ({
  generateDigest: vi.fn(),
}));

vi.mock("../../services/deviationService", () => ({
  analyzeDeviation: vi.fn(),
}));

vi.mock("../../services/ieuService", () => ({
  fetchIeuLearningOutcomes: vi.fn(),
}));

vi.mock("../../services/lessonAiService", () => ({
  generatePlan: vi.fn(),
  generateQuizFromPlan: vi.fn(),
  generateQuizAnswers: vi.fn(),
  evaluateQuizAnswer: vi.fn(),
  evaluateQuizBatch: vi.fn(),
  buildChatContextForLesson: vi.fn(),
  generateChatResponseStream: vi.fn(),
  generateChatResponseSync: vi.fn(),
  generateMindmap: vi.fn(),
  generateMindmapModule: vi.fn(),
  generateMindmapNodeDetail: vi.fn(),
}));

vi.mock("../../middleware/validate", () => ({
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../../validators/lessonSchemas", () => ({
  upsertLessonSchema: {},
  progressSchema: {},
  planFromTextSchema: {},
  cheatSheetSchema: {},
  loAlignSchema: {},
  chatSchema: {},
  mindmapModuleSchema: {},
  mindmapNodeDetailSchema: {},
}));

vi.mock("../../validators/quizSchemas", () => ({
  quizFromPlanSchema: {},
  quizEvalSchema: {},
  quizAnswersSchema: {},
  quizEvalBatchSchema: {},
}));

import router from "../lessonRoutes";
import { AppError } from "../../middleware/errorHandler";

// Helper: find route handler from Express router stack
type Method = "get" | "post" | "patch" | "delete";

function findHandler(method: Method, routePath: string) {
  for (const layer of (router as any).stack) {
    if (
      layer.route &&
      layer.route.path === routePath &&
      layer.route.methods[method]
    ) {
      // Return the last handler in the stack (after any middleware like validate)
      const handlers = layer.route.stack
        .filter((s: any) => s.method === method)
        .map((s: any) => s.handle);
      return handlers[handlers.length - 1];
    }
  }
  throw new Error(`Route ${method.toUpperCase()} ${routePath} not found`);
}

function mockReq(overrides: Record<string, any> = {}) {
  return {
    params: {},
    body: {},
    query: {},
    user: { userId: "test-user-id" },
    ...overrides,
  } as any;
}

function mockRes() {
  const res: any = {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  return res;
}

/** Calls an asyncHandler-wrapped route handler and re-throws any error passed to next() */
async function callHandler(handler: Function, req: any, res: any): Promise<void> {
  let caughtError: unknown;
  const next = (err?: unknown) => { caughtError = err; };
  await handler(req, res, next);
  if (caughtError) throw caughtError;
}

describe("lessonRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- GET /lessons ----
  describe("GET /lessons", () => {
    it("returns all lessons for user", async () => {
      const lessons = [{ id: "lec-1", title: "A" }, { id: "lec-2", title: "B" }];
      mockListLessonsForUser.mockReturnValue(lessons);

      const req = mockReq();
      const res = mockRes();
      await findHandler("get", "/lessons")(req, res);

      expect(mockListLessonsForUser).toHaveBeenCalledWith("test-user-id");
      expect(res.json).toHaveBeenCalledWith({ ok: true, lessons });
    });

    it("returns empty array when no lessons exist", async () => {
      mockListLessonsForUser.mockReturnValue([]);

      const req = mockReq();
      const res = mockRes();
      await findHandler("get", "/lessons")(req, res);

      expect(res.json).toHaveBeenCalledWith({ ok: true, lessons: [] });
    });
  });

  // ---- GET /lessons/:id ----
  describe("GET /lessons/:id", () => {
    it("returns a lesson when found", async () => {
      const lesson = { id: "lec-42", title: "Calculus", userId: "test-user-id" };
      mockGetLesson.mockReturnValue(lesson);

      const req = mockReq({ params: { id: "lec-42" } });
      const res = mockRes();
      await findHandler("get", "/lessons/:id")(req, res);

      expect(mockGetLesson).toHaveBeenCalledWith("lec-42");
      expect(res.json).toHaveBeenCalledWith({ ok: true, lesson });
    });

    it("throws AppError 404 when lesson not found", async () => {
      mockGetLesson.mockReturnValue(null);

      const req = mockReq({ params: { id: "nonexistent" } });
      const res = mockRes();
      const handler = findHandler("get", "/lessons/:id");

      await expect(callHandler(handler, req, res)).rejects.toThrow(AppError);
      await expect(callHandler(handler, req, res)).rejects.toThrow("Lesson not found");
    });
  });

  // ---- POST /lessons ----
  describe("POST /lessons", () => {
    it("creates a lesson and returns 201 with ok:true", async () => {
      const body = { title: "New Lecture", transcript: "Hello" };
      const saved = { id: "lec-100", ...body };
      mockUpsertLesson.mockResolvedValue(saved);

      const req = mockReq({ body });
      const res = mockRes();
      await findHandler("post", "/lessons")(req, res);

      expect(mockUpsertLesson).toHaveBeenCalledWith({ ...body, userId: "test-user-id" });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ ok: true, lesson: saved });
    });
  });

  // ---- PATCH /lessons/:id/progress ----
  describe("PATCH /lessons/:id/progress", () => {
    it("updates progress when lesson exists", async () => {
      const lesson = { id: "lec-1", userId: "test-user-id" };
      const updated = { id: "lec-1", progress: { lastMode: "quiz", percent: 75 } };
      mockGetLesson.mockReturnValue(lesson);
      mockUpdateProgress.mockReturnValue(updated);

      const req = mockReq({ params: { id: "lec-1" }, body: { lastMode: "quiz", percent: 75 } });
      const res = mockRes();
      await findHandler("patch", "/lessons/:id/progress")(req, res);

      expect(mockUpdateProgress).toHaveBeenCalledWith("lec-1", req.body);
      expect(res.json).toHaveBeenCalledWith({ ok: true, lesson: updated });
    });

    it("throws 404 when lesson not found for progress update", async () => {
      mockGetLesson.mockReturnValue(null);

      const req = mockReq({ params: { id: "nonexistent" }, body: { percent: 50 } });
      const res = mockRes();
      const handler = findHandler("patch", "/lessons/:id/progress");

      await expect(callHandler(handler, req, res)).rejects.toThrow(AppError);
    });
  });

  // ---- DELETE /lessons/:id ----
  describe("DELETE /lessons/:id", () => {
    it("deletes a lesson and removes from course", async () => {
      const lesson = { id: "lec-del", userId: "test-user-id" };
      const course = { id: "course-1", lessonIds: ["lec-del"] };
      mockGetLesson.mockReturnValue(lesson);
      mockGetCourseForLesson.mockReturnValue(course);
      mockRemoveLessonFromCourse.mockReturnValue(course);
      mockDeleteLesson.mockReturnValue(true);

      const req = mockReq({ params: { id: "lec-del" } });
      const res = mockRes();
      await findHandler("delete", "/lessons/:id")(req, res);

      expect(mockGetLesson).toHaveBeenCalledWith("lec-del");
      expect(mockGetCourseForLesson).toHaveBeenCalledWith("lec-del");
      expect(mockRemoveLessonFromCourse).toHaveBeenCalledWith("course-1", "lec-del");
      expect(mockRebuildKnowledgeIndex).toHaveBeenCalledWith("course-1");
      expect(mockDeleteLesson).toHaveBeenCalledWith("lec-del");
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });

    it("deletes a lesson not assigned to any course", async () => {
      const lesson = { id: "lec-orphan", userId: "test-user-id" };
      mockGetLesson.mockReturnValue(lesson);
      mockGetCourseForLesson.mockReturnValue(null);
      mockDeleteLesson.mockReturnValue(true);

      const req = mockReq({ params: { id: "lec-orphan" } });
      const res = mockRes();
      await findHandler("delete", "/lessons/:id")(req, res);

      expect(mockRemoveLessonFromCourse).not.toHaveBeenCalled();
      expect(mockRebuildKnowledgeIndex).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });

    it("throws 404 when lesson to delete is not found", async () => {
      mockGetLesson.mockReturnValue(null);

      const req = mockReq({ params: { id: "nonexistent" } });
      const res = mockRes();
      const handler = findHandler("delete", "/lessons/:id");

      await expect(callHandler(handler, req, res)).rejects.toThrow(AppError);
      await expect(callHandler(handler, req, res)).rejects.toThrow("Lesson not found");
    });
  });

  // ---- GET /memory ----
  describe("GET /memory", () => {
    it("returns global memory", async () => {
      const memory = { recurringConcepts: ["OOP"], recentEmphases: [], lastUpdated: "2026-01-01" };
      mockGetMemory.mockResolvedValue(memory);

      const req = mockReq();
      const res = mockRes();
      await findHandler("get", "/memory")(req, res);

      expect(mockGetMemory).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith({ ok: true, memory });
    });
  });
});
