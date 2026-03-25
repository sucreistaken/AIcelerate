import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock controller functions before importing the router
const mockListLessons = vi.fn();
const mockGetLesson = vi.fn();
const mockUpsertLesson = vi.fn();
const mockUpdateProgress = vi.fn();
const mockDeleteLesson = vi.fn();
const mockGetMemory = vi.fn();

vi.mock("../../controllers/lessonControllers", () => ({
  listLessons: (...args: any[]) => mockListLessons(...args),
  getLesson: (...args: any[]) => mockGetLesson(...args),
  upsertLesson: (...args: any[]) => mockUpsertLesson(...args),
  updateProgress: (...args: any[]) => mockUpdateProgress(...args),
  deleteLesson: (...args: any[]) => mockDeleteLesson(...args),
  getMemory: (...args: any[]) => mockGetMemory(...args),
}));

const mockGetCourseForLesson = vi.fn();
const mockRemoveLessonFromCourse = vi.fn();
const mockRebuildKnowledgeIndex = vi.fn();

vi.mock("../../controllers/courseController", () => ({
  getCourseForLesson: (...args: any[]) => mockGetCourseForLesson(...args),
  removeLessonFromCourse: (...args: any[]) => mockRemoveLessonFromCourse(...args),
  rebuildKnowledgeIndex: (...args: any[]) => mockRebuildKnowledgeIndex(...args),
}));

vi.mock("../../controllers/contextAssembler", () => ({
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
    ...overrides,
  } as any;
}

function mockRes() {
  const res: any = {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  };
  return res;
}

describe("lessonRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- GET /lessons ----
  describe("GET /lessons", () => {
    it("returns all lessons", () => {
      const lessons = [{ id: "lec-1", title: "A" }, { id: "lec-2", title: "B" }];
      mockListLessons.mockReturnValue(lessons);

      const req = mockReq();
      const res = mockRes();
      const handler = findHandler("get", "/lessons");

      handler(req, res);

      expect(mockListLessons).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith(lessons);
    });

    it("returns empty array when no lessons exist", () => {
      mockListLessons.mockReturnValue([]);

      const req = mockReq();
      const res = mockRes();
      findHandler("get", "/lessons")(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  // ---- GET /lessons/:id ----
  describe("GET /lessons/:id", () => {
    it("returns a lesson when found", () => {
      const lesson = { id: "lec-42", title: "Calculus" };
      mockGetLesson.mockReturnValue(lesson);

      const req = mockReq({ params: { id: "lec-42" } });
      const res = mockRes();
      findHandler("get", "/lessons/:id")(req, res);

      expect(mockGetLesson).toHaveBeenCalledWith("lec-42");
      expect(res.json).toHaveBeenCalledWith(lesson);
    });

    it("throws AppError 404 when lesson not found", () => {
      mockGetLesson.mockReturnValue(null);

      const req = mockReq({ params: { id: "nonexistent" } });
      const res = mockRes();

      expect(() => findHandler("get", "/lessons/:id")(req, res)).toThrow(AppError);
      expect(() => findHandler("get", "/lessons/:id")(req, res)).toThrow("Lesson not found");
    });
  });

  // ---- POST /lessons ----
  describe("POST /lessons", () => {
    it("creates a lesson and returns it", () => {
      const body = { title: "New Lecture", transcript: "Hello" };
      const saved = { id: "lec-100", ...body };
      mockUpsertLesson.mockReturnValue(saved);

      const req = mockReq({ body });
      const res = mockRes();
      findHandler("post", "/lessons")(req, res);

      expect(mockUpsertLesson).toHaveBeenCalledWith(body);
      expect(res.json).toHaveBeenCalledWith(saved);
    });
  });

  // ---- PATCH /lessons/:id/progress ----
  describe("PATCH /lessons/:id/progress", () => {
    it("updates progress when lesson exists", () => {
      const updated = { id: "lec-1", progress: { lastMode: "quiz", percent: 75 } };
      mockUpdateProgress.mockReturnValue(updated);

      const req = mockReq({ params: { id: "lec-1" }, body: { lastMode: "quiz", percent: 75 } });
      const res = mockRes();
      findHandler("patch", "/lessons/:id/progress")(req, res);

      expect(mockUpdateProgress).toHaveBeenCalledWith("lec-1", req.body);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it("throws 404 when lesson not found for progress update", () => {
      mockUpdateProgress.mockReturnValue(null);

      const req = mockReq({ params: { id: "nonexistent" }, body: { percent: 50 } });
      const res = mockRes();

      expect(() => findHandler("patch", "/lessons/:id/progress")(req, res)).toThrow(AppError);
    });
  });

  // ---- DELETE /lessons/:id ----
  describe("DELETE /lessons/:id", () => {
    it("deletes a lesson and removes from course", () => {
      const course = { id: "course-1", lessonIds: ["lec-del"] };
      mockGetCourseForLesson.mockReturnValue(course);
      mockRemoveLessonFromCourse.mockReturnValue(course);
      mockDeleteLesson.mockReturnValue(true);

      const req = mockReq({ params: { id: "lec-del" } });
      const res = mockRes();
      findHandler("delete", "/lessons/:id")(req, res);

      expect(mockGetCourseForLesson).toHaveBeenCalledWith("lec-del");
      expect(mockRemoveLessonFromCourse).toHaveBeenCalledWith("course-1", "lec-del");
      expect(mockRebuildKnowledgeIndex).toHaveBeenCalledWith("course-1");
      expect(mockDeleteLesson).toHaveBeenCalledWith("lec-del");
      expect(res.json).toHaveBeenCalledWith({ ok: true, deleted: "lec-del" });
    });

    it("deletes a lesson not assigned to any course", () => {
      mockGetCourseForLesson.mockReturnValue(null);
      mockDeleteLesson.mockReturnValue(true);

      const req = mockReq({ params: { id: "lec-orphan" } });
      const res = mockRes();
      findHandler("delete", "/lessons/:id")(req, res);

      expect(mockRemoveLessonFromCourse).not.toHaveBeenCalled();
      expect(mockRebuildKnowledgeIndex).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ ok: true, deleted: "lec-orphan" });
    });

    it("throws 404 when lesson to delete is not found", () => {
      mockGetCourseForLesson.mockReturnValue(null);
      mockDeleteLesson.mockReturnValue(false);

      const req = mockReq({ params: { id: "nonexistent" } });
      const res = mockRes();

      expect(() => findHandler("delete", "/lessons/:id")(req, res)).toThrow(AppError);
      expect(() => findHandler("delete", "/lessons/:id")(req, res)).toThrow("Lesson not found");
    });
  });

  // ---- GET /memory ----
  describe("GET /memory", () => {
    it("returns global memory", () => {
      const memory = { recurringConcepts: ["OOP"], recentEmphases: [], lastUpdated: "2026-01-01" };
      mockGetMemory.mockReturnValue(memory);

      const req = mockReq();
      const res = mockRes();
      findHandler("get", "/memory")(req, res);

      expect(mockGetMemory).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith(memory);
    });
  });
});
