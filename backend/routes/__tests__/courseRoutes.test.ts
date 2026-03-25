import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock controller functions before importing the router
const mockListCourses = vi.fn();
const mockGetCourse = vi.fn();
const mockCreateCourse = vi.fn();
const mockUpdateCourse = vi.fn();
const mockDeleteCourse = vi.fn();
const mockAddLessonToCourse = vi.fn();
const mockRemoveLessonFromCourse = vi.fn();
const mockGetCourseLessons = vi.fn();
const mockRebuildKnowledgeIndex = vi.fn();
const mockGetCourseProgress = vi.fn();
const mockExportCourseData = vi.fn();

vi.mock("../../controllers/courseController", () => ({
  listCourses: (...args: any[]) => mockListCourses(...args),
  getCourse: (...args: any[]) => mockGetCourse(...args),
  createCourse: (...args: any[]) => mockCreateCourse(...args),
  updateCourse: (...args: any[]) => mockUpdateCourse(...args),
  deleteCourse: (...args: any[]) => mockDeleteCourse(...args),
  addLessonToCourse: (...args: any[]) => mockAddLessonToCourse(...args),
  removeLessonFromCourse: (...args: any[]) => mockRemoveLessonFromCourse(...args),
  getCourseLessons: (...args: any[]) => mockGetCourseLessons(...args),
  rebuildKnowledgeIndex: (...args: any[]) => mockRebuildKnowledgeIndex(...args),
  getCourseProgress: (...args: any[]) => mockGetCourseProgress(...args),
  exportCourseData: (...args: any[]) => mockExportCourseData(...args),
}));

const mockUpsertLesson = vi.fn();

vi.mock("../../controllers/lessonControllers", () => ({
  upsertLesson: (...args: any[]) => mockUpsertLesson(...args),
}));

vi.mock("../../services/courseAiService", () => ({
  generateCourseChatResponse: vi.fn(),
  generateStudySchedule: vi.fn(),
}));

vi.mock("../../middleware/validate", () => ({
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../../validators/courseSchemas", () => ({
  createCourseSchema: {},
  updateCourseSchema: {},
  courseChatSchema: {},
  studyScheduleSchema: {},
}));

import router from "../courseRoutes";
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

describe("courseRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- GET /courses ----
  describe("GET /courses", () => {
    it("returns all courses", () => {
      const courses = [
        { id: "course-1", code: "CS101", name: "Intro" },
        { id: "course-2", code: "MATH201", name: "Calculus" },
      ];
      mockListCourses.mockReturnValue(courses);

      const req = mockReq();
      const res = mockRes();
      findHandler("get", "/courses")(req, res);

      expect(mockListCourses).toHaveBeenCalledOnce();
      expect(res.json).toHaveBeenCalledWith({ ok: true, courses });
    });
  });

  // ---- POST /courses ----
  describe("POST /courses", () => {
    it("creates a new course", () => {
      const body = { code: "CS101", name: "Intro to CS" };
      const created = { id: "course-new", ...body, lessonIds: [] };
      mockCreateCourse.mockReturnValue(created);

      const req = mockReq({ body });
      const res = mockRes();
      findHandler("post", "/courses")(req, res);

      expect(mockCreateCourse).toHaveBeenCalledWith(body);
      expect(res.json).toHaveBeenCalledWith({ ok: true, course: created });
    });
  });

  // ---- GET /courses/:id ----
  describe("GET /courses/:id", () => {
    it("returns a course when found", () => {
      const course = { id: "course-1", code: "CS101", name: "Intro" };
      mockGetCourse.mockReturnValue(course);

      const req = mockReq({ params: { id: "course-1" } });
      const res = mockRes();
      findHandler("get", "/courses/:id")(req, res);

      expect(mockGetCourse).toHaveBeenCalledWith("course-1");
      expect(res.json).toHaveBeenCalledWith({ ok: true, course });
    });

    it("throws 404 when course not found", () => {
      mockGetCourse.mockReturnValue(null);

      const req = mockReq({ params: { id: "nonexistent" } });
      const res = mockRes();

      expect(() => findHandler("get", "/courses/:id")(req, res)).toThrow(AppError);
      expect(() => findHandler("get", "/courses/:id")(req, res)).toThrow("Course not found");
    });
  });

  // ---- DELETE /courses/:id ----
  describe("DELETE /courses/:id", () => {
    it("deletes a course successfully", () => {
      mockDeleteCourse.mockReturnValue(true);

      const req = mockReq({ params: { id: "course-del" } });
      const res = mockRes();
      findHandler("delete", "/courses/:id")(req, res);

      expect(mockDeleteCourse).toHaveBeenCalledWith("course-del");
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("throws 404 when course to delete is not found", () => {
      mockDeleteCourse.mockReturnValue(false);

      const req = mockReq({ params: { id: "nonexistent" } });
      const res = mockRes();

      expect(() => findHandler("delete", "/courses/:id")(req, res)).toThrow(AppError);
      expect(() => findHandler("delete", "/courses/:id")(req, res)).toThrow("Course not found");
    });
  });

  // ---- POST /courses/:id/lessons/:lessonId (add lesson) ----
  describe("POST /courses/:id/lessons/:lessonId", () => {
    it("adds a lesson to a course", () => {
      const course = { id: "course-1", lessonIds: ["lec-1"] };
      const updatedCourse = { id: "course-1", lessonIds: ["lec-1", "lec-2"] };
      mockAddLessonToCourse.mockReturnValue(course);
      mockGetCourse.mockReturnValue(updatedCourse);
      mockRebuildKnowledgeIndex.mockReturnValue({});

      const req = mockReq({ params: { id: "course-1", lessonId: "lec-2" } });
      const res = mockRes();
      findHandler("post", "/courses/:id/lessons/:lessonId")(req, res);

      expect(mockAddLessonToCourse).toHaveBeenCalledWith("course-1", "lec-2");
      expect(mockUpsertLesson).toHaveBeenCalledWith({ id: "lec-2", courseId: "course-1" });
      expect(mockRebuildKnowledgeIndex).toHaveBeenCalledWith("course-1");
      expect(res.json).toHaveBeenCalledWith({ ok: true, course: updatedCourse });
    });

    it("throws 404 when course not found for adding lesson", () => {
      mockAddLessonToCourse.mockReturnValue(null);

      const req = mockReq({ params: { id: "nonexistent", lessonId: "lec-1" } });
      const res = mockRes();

      expect(() => findHandler("post", "/courses/:id/lessons/:lessonId")(req, res)).toThrow(AppError);
      expect(() => findHandler("post", "/courses/:id/lessons/:lessonId")(req, res)).toThrow("Course not found");
    });
  });

  // ---- DELETE /courses/:id/lessons/:lessonId (remove lesson) ----
  describe("DELETE /courses/:id/lessons/:lessonId", () => {
    it("removes a lesson from a course", () => {
      const course = { id: "course-1", lessonIds: [] };
      const updatedCourse = { id: "course-1", lessonIds: [] };
      mockRemoveLessonFromCourse.mockReturnValue(course);
      mockGetCourse.mockReturnValue(updatedCourse);
      mockRebuildKnowledgeIndex.mockReturnValue({});

      const req = mockReq({ params: { id: "course-1", lessonId: "lec-1" } });
      const res = mockRes();
      findHandler("delete", "/courses/:id/lessons/:lessonId")(req, res);

      expect(mockRemoveLessonFromCourse).toHaveBeenCalledWith("course-1", "lec-1");
      expect(mockUpsertLesson).toHaveBeenCalledWith({ id: "lec-1", courseId: undefined });
      expect(mockRebuildKnowledgeIndex).toHaveBeenCalledWith("course-1");
      expect(res.json).toHaveBeenCalledWith({ ok: true, course: updatedCourse });
    });

    it("throws 404 when course not found for removing lesson", () => {
      mockRemoveLessonFromCourse.mockReturnValue(null);

      const req = mockReq({ params: { id: "nonexistent", lessonId: "lec-1" } });
      const res = mockRes();

      expect(() => findHandler("delete", "/courses/:id/lessons/:lessonId")(req, res)).toThrow(AppError);
    });
  });

  // ---- GET /courses/:id/lessons ----
  describe("GET /courses/:id/lessons", () => {
    it("returns lessons for a course", () => {
      const lessons = [{ id: "lec-1", title: "Week 1" }];
      mockGetCourseLessons.mockReturnValue(lessons);

      const req = mockReq({ params: { id: "course-1" } });
      const res = mockRes();
      findHandler("get", "/courses/:id/lessons")(req, res);

      expect(mockGetCourseLessons).toHaveBeenCalledWith("course-1");
      expect(res.json).toHaveBeenCalledWith({ ok: true, lessons });
    });
  });

  // ---- GET /courses/:id/progress ----
  describe("GET /courses/:id/progress", () => {
    it("returns progress for a valid course", () => {
      const progress = { courseId: "course-1", totalLessons: 3, completedLessons: 1 };
      mockGetCourseProgress.mockReturnValue(progress);

      const req = mockReq({ params: { id: "course-1" } });
      const res = mockRes();
      findHandler("get", "/courses/:id/progress")(req, res);

      expect(mockGetCourseProgress).toHaveBeenCalledWith("course-1");
      expect(res.json).toHaveBeenCalledWith({ ok: true, progress });
    });

    it("throws 404 when course not found for progress", () => {
      mockGetCourseProgress.mockReturnValue(null);

      const req = mockReq({ params: { id: "nonexistent" } });
      const res = mockRes();

      expect(() => findHandler("get", "/courses/:id/progress")(req, res)).toThrow(AppError);
    });
  });
});
