import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Course } from "../../services/courseDataService";

// Ensure env vars are set before any module loads
vi.hoisted(() => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-long!!";
  process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";
  process.env.NODE_ENV = "test";
});

// Mock the cache module — factory must be self-contained (no external refs)
vi.mock("../../cache", () => {
  const _store = { courses: [] as any[] };
  return {
    courseCache: {
      getAll: () => _store.courses,
      get: (id: string) => _store.courses.find((c: any) => c.id === id) ?? null,
      set: (item: any) => {
        const idx = _store.courses.findIndex((c: any) => c.id === item.id);
        if (idx >= 0) _store.courses[idx] = item;
        else _store.courses.push(item);
      },
      setAll: (items: any[]) => { _store.courses = items; },
      delete: (id: string) => {
        const idx = _store.courses.findIndex((c: any) => c.id === id);
        if (idx < 0) return false;
        _store.courses.splice(idx, 1);
        return true;
      },
      find: (pred: any) => _store.courses.find(pred) ?? null,
      filter: (pred: any) => _store.courses.filter(pred),
      count: () => _store.courses.length,
      flush: vi.fn(),
      _store,
    },
    lessonCache: {
      getAll: () => [],
      get: () => null,
    },
    flashcardCache: {
      getAll: () => [],
      getByIndex: () => [],
      filter: () => [],
    },
    courseProgressCache: { get: () => undefined, set: vi.fn(), invalidate: vi.fn(), clear: vi.fn() },
    knowledgeIndexCache: { get: () => undefined, set: vi.fn(), invalidate: vi.fn(), clear: vi.fn() },
    invalidateLessonCaches: vi.fn(),
    invalidateFlashcardCaches: vi.fn(),
    flushAllCaches: vi.fn(),
  };
});

vi.mock("../../utils/fileHandler", () => ({
  readJSON: vi.fn(),
  writeJSON: vi.fn(),
  ensureDataFiles: vi.fn(),
}));

vi.mock("../../services/weaknessService", () => ({
  weaknessService: {
    getWeaknessForLesson: vi.fn(() => null),
    getGlobalWeaknessSummary: vi.fn(() => ({ weakTopics: [], strongTopics: [] })),
  },
}));

vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })) },
}));

// Import directly from service (canonical location)
import {
  createCourse,
  getCourse,
  listCourses,
  updateCourse,
  deleteCourse,
  addLessonToCourse,
  removeLessonFromCourse,
  getCourseForLesson,
} from "../../services/courseDataService";

import { courseCache } from "../../cache";

function makeSampleCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "course-test-1",
    code: "CS101",
    name: "Intro to CS",
    description: "A test course",
    lessonIds: [],
    learningOutcomes: [],
    settings: { language: "en" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("courseController", () => {
  beforeEach(() => {
    (courseCache as any)._store.courses = [];
  });

  describe("listCourses", () => {
    it("returns empty array when no courses exist", () => {
      expect(listCourses()).toEqual([]);
    });

    it("returns all stored courses", () => {
      (courseCache as any)._store.courses = [
        makeSampleCourse({ id: "c1", name: "Course 1" }),
        makeSampleCourse({ id: "c2", name: "Course 2" }),
      ];
      const result = listCourses();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Course 1");
    });
  });

  describe("getCourse", () => {
    it("returns null when course does not exist", () => {
      expect(getCourse("nonexistent")).toBeNull();
    });

    it("returns the correct course by id", () => {
      (courseCache as any)._store.courses = [makeSampleCourse({ id: "c42", name: "Calculus" })];
      const result = getCourse("c42");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("Calculus");
    });
  });

  describe("createCourse", () => {
    it("creates a course with the given data", () => {
      const course = createCourse({ code: "MATH101", name: "Math" });
      expect(course.id).toMatch(/^course-/);
      expect(course.code).toBe("MATH101");
      expect(course.name).toBe("Math");
      expect(course.lessonIds).toEqual([]);
      expect((courseCache as any)._store.courses).toHaveLength(1);
    });

    it("sets default settings when not provided", () => {
      const course = createCourse({ code: "X", name: "Y" });
      expect(course.settings).toEqual({ language: "en" });
    });

    it("uses provided settings", () => {
      const course = createCourse({
        code: "TR1",
        name: "Turkish Course",
        settings: { language: "tr", examDate: "2026-06-01" },
      });
      expect(course.settings!.language).toBe("tr");
      expect(course.settings!.examDate).toBe("2026-06-01");
    });

    it("stores learningOutcomes when provided", () => {
      const course = createCourse({
        code: "LO1",
        name: "LO Test",
        learningOutcomes: ["Understand X", "Apply Y"],
      });
      expect(course.learningOutcomes).toEqual(["Understand X", "Apply Y"]);
    });

    it("sets timestamps on creation", () => {
      const course = createCourse({ code: "TS", name: "Timestamp Test" });
      expect(course.createdAt).toBeDefined();
      expect(course.updatedAt).toBeDefined();
    });
  });

  describe("updateCourse", () => {
    it("updates an existing course and returns it", () => {
      (courseCache as any)._store.courses = [makeSampleCourse({ id: "u1", name: "Old Name" })];
      const updated = updateCourse("u1", { name: "New Name" });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("New Name");
    });

    it("returns null for non-existent course", () => {
      const result = updateCourse("missing", { name: "X" });
      expect(result).toBeNull();
    });

    it("updates the updatedAt timestamp", () => {
      (courseCache as any)._store.courses = [makeSampleCourse({ id: "u2", updatedAt: "2020-01-01T00:00:00.000Z" })];
      const updated = updateCourse("u2", { name: "Updated" });
      expect(updated!.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    });

    it("preserves fields not included in updates", () => {
      (courseCache as any)._store.courses = [makeSampleCourse({ id: "u3", code: "KEEP", name: "KeepName" })];
      const updated = updateCourse("u3", { description: "New desc" });
      expect(updated!.code).toBe("KEEP");
      expect(updated!.name).toBe("KeepName");
    });
  });

  describe("deleteCourse", () => {
    it("removes the course and returns true", () => {
      (courseCache as any)._store.courses = [makeSampleCourse({ id: "d1" })];
      const result = deleteCourse("d1");
      expect(result).toBe(true);
      expect((courseCache as any)._store.courses).toHaveLength(0);
    });

    it("returns false for non-existent course", () => {
      const result = deleteCourse("nonexistent");
      expect(result).toBe(false);
    });

    it("only removes the targeted course", () => {
      (courseCache as any)._store.courses = [
        makeSampleCourse({ id: "d1" }),
        makeSampleCourse({ id: "d2" }),
        makeSampleCourse({ id: "d3" }),
      ];
      deleteCourse("d2");
      const store = (courseCache as any)._store.courses;
      expect(store).toHaveLength(2);
      expect(store.map((c: any) => c.id)).toEqual(["d1", "d3"]);
    });
  });

  describe("addLessonToCourse", () => {
    it("adds lessonId to course.lessonIds array", () => {
      (courseCache as any)._store.courses = [makeSampleCourse({ id: "alc1", lessonIds: [] })];
      const result = addLessonToCourse("alc1", "lesson-1");
      expect(result).not.toBeNull();
      expect(result!.lessonIds).toContain("lesson-1");
    });

    it("does not add duplicate lessonId", () => {
      (courseCache as any)._store.courses = [makeSampleCourse({ id: "alc2", lessonIds: ["lesson-1"] })];
      addLessonToCourse("alc2", "lesson-1");
      expect((courseCache as any)._store.courses[0].lessonIds).toEqual(["lesson-1"]);
    });

    it("returns null for non-existent course", () => {
      const result = addLessonToCourse("missing", "lesson-1");
      expect(result).toBeNull();
    });

    it("updates the updatedAt timestamp", () => {
      (courseCache as any)._store.courses = [makeSampleCourse({ id: "alc3", updatedAt: "2020-01-01T00:00:00.000Z" })];
      const result = addLessonToCourse("alc3", "lesson-new");
      expect(result!.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    });
  });

  describe("removeLessonFromCourse", () => {
    it("removes lessonId from course.lessonIds", () => {
      (courseCache as any)._store.courses = [makeSampleCourse({ id: "rlc1", lessonIds: ["l1", "l2", "l3"] })];
      const result = removeLessonFromCourse("rlc1", "l2");
      expect(result).not.toBeNull();
      expect(result!.lessonIds).toEqual(["l1", "l3"]);
    });

    it("returns null for non-existent course", () => {
      const result = removeLessonFromCourse("missing", "l1");
      expect(result).toBeNull();
    });

    it("handles removing a lessonId that is not in the array", () => {
      (courseCache as any)._store.courses = [makeSampleCourse({ id: "rlc2", lessonIds: ["l1"] })];
      const result = removeLessonFromCourse("rlc2", "l99");
      expect(result).not.toBeNull();
      expect(result!.lessonIds).toEqual(["l1"]);
    });
  });

  describe("getCourseForLesson", () => {
    it("returns the course containing the lesson", () => {
      (courseCache as any)._store.courses = [
        makeSampleCourse({ id: "cf1", lessonIds: ["l1", "l2"] }),
        makeSampleCourse({ id: "cf2", lessonIds: ["l3"] }),
      ];
      const result = getCourseForLesson("l3");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("cf2");
    });

    it("returns null when lesson is not in any course", () => {
      (courseCache as any)._store.courses = [makeSampleCourse({ id: "cf3", lessonIds: ["l1"] })];
      const result = getCourseForLesson("orphan");
      expect(result).toBeNull();
    });
  });
});
