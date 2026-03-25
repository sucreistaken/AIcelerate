import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Course } from "../courseController";

// In-memory store for courses
let coursesStore: Course[] = [];

vi.mock("../../utils/file-Handler", () => ({
  readJSON: vi.fn(),
  writeJSON: vi.fn(),
  ensureDataFiles: vi.fn(),
}));

vi.mock("../../repositories/courseRepo", () => ({
  courseRepo: {
    findAllSync: vi.fn(() => coursesStore),
    saveAllSync: vi.fn((data: any) => { coursesStore = data; }),
  },
}));

// Mock lesson-related imports
vi.mock("../lessonControllers", () => ({
  listLessons: vi.fn(() => []),
  getLesson: vi.fn(() => null),
}));

vi.mock("../flashcardController", () => ({
  getFlashcards: vi.fn(() => []),
  getDueCards: vi.fn(() => []),
}));

vi.mock("../connectionsController", () => ({
  getConnections: vi.fn(() => []),
}));

vi.mock("../weaknessController", () => ({
  getGlobalWeaknessSummary: vi.fn(() => ({ weakTopics: [], strongTopics: [] })),
  getWeaknessForLesson: vi.fn(() => null),
}));

// Import after mocks
import {
  createCourse,
  getCourse,
  listCourses,
  updateCourse,
  deleteCourse,
  addLessonToCourse,
  removeLessonFromCourse,
  getCourseLessons,
  getCourseForLesson,
} from "../courseController";

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
    coursesStore = [];
  });

  describe("listCourses", () => {
    it("returns empty array when no courses exist", () => {
      expect(listCourses()).toEqual([]);
    });

    it("returns all stored courses", () => {
      coursesStore = [
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
      coursesStore = [makeSampleCourse({ id: "c42", name: "Calculus" })];
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
      expect(coursesStore).toHaveLength(1);
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
      coursesStore = [makeSampleCourse({ id: "u1", name: "Old Name" })];
      const updated = updateCourse("u1", { name: "New Name" });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("New Name");
    });

    it("returns null for non-existent course", () => {
      const result = updateCourse("missing", { name: "X" });
      expect(result).toBeNull();
    });

    it("updates the updatedAt timestamp", () => {
      coursesStore = [makeSampleCourse({ id: "u2", updatedAt: "2020-01-01T00:00:00.000Z" })];
      const updated = updateCourse("u2", { name: "Updated" });
      expect(updated!.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    });

    it("preserves fields not included in updates", () => {
      coursesStore = [makeSampleCourse({ id: "u3", code: "KEEP", name: "KeepName" })];
      const updated = updateCourse("u3", { description: "New desc" });
      expect(updated!.code).toBe("KEEP");
      expect(updated!.name).toBe("KeepName");
    });
  });

  describe("deleteCourse", () => {
    it("removes the course and returns true", () => {
      coursesStore = [makeSampleCourse({ id: "d1" })];
      const result = deleteCourse("d1");
      expect(result).toBe(true);
      expect(coursesStore).toHaveLength(0);
    });

    it("returns false for non-existent course", () => {
      const result = deleteCourse("nonexistent");
      expect(result).toBe(false);
    });

    it("only removes the targeted course", () => {
      coursesStore = [
        makeSampleCourse({ id: "d1" }),
        makeSampleCourse({ id: "d2" }),
        makeSampleCourse({ id: "d3" }),
      ];
      deleteCourse("d2");
      expect(coursesStore).toHaveLength(2);
      expect(coursesStore.map((c) => c.id)).toEqual(["d1", "d3"]);
    });
  });

  describe("addLessonToCourse", () => {
    it("adds lessonId to course.lessonIds array", () => {
      coursesStore = [makeSampleCourse({ id: "alc1", lessonIds: [] })];
      const result = addLessonToCourse("alc1", "lesson-1");
      expect(result).not.toBeNull();
      expect(result!.lessonIds).toContain("lesson-1");
    });

    it("does not add duplicate lessonId", () => {
      coursesStore = [makeSampleCourse({ id: "alc2", lessonIds: ["lesson-1"] })];
      addLessonToCourse("alc2", "lesson-1");
      expect(coursesStore[0].lessonIds).toEqual(["lesson-1"]);
    });

    it("returns null for non-existent course", () => {
      const result = addLessonToCourse("missing", "lesson-1");
      expect(result).toBeNull();
    });

    it("updates the updatedAt timestamp", () => {
      coursesStore = [makeSampleCourse({ id: "alc3", updatedAt: "2020-01-01T00:00:00.000Z" })];
      const result = addLessonToCourse("alc3", "lesson-new");
      expect(result!.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    });
  });

  describe("removeLessonFromCourse", () => {
    it("removes lessonId from course.lessonIds", () => {
      coursesStore = [makeSampleCourse({ id: "rlc1", lessonIds: ["l1", "l2", "l3"] })];
      const result = removeLessonFromCourse("rlc1", "l2");
      expect(result).not.toBeNull();
      expect(result!.lessonIds).toEqual(["l1", "l3"]);
    });

    it("returns null for non-existent course", () => {
      const result = removeLessonFromCourse("missing", "l1");
      expect(result).toBeNull();
    });

    it("handles removing a lessonId that is not in the array", () => {
      coursesStore = [makeSampleCourse({ id: "rlc2", lessonIds: ["l1"] })];
      const result = removeLessonFromCourse("rlc2", "l99");
      expect(result).not.toBeNull();
      expect(result!.lessonIds).toEqual(["l1"]);
    });
  });

  describe("getCourseForLesson", () => {
    it("returns the course containing the lesson", () => {
      coursesStore = [
        makeSampleCourse({ id: "cf1", lessonIds: ["l1", "l2"] }),
        makeSampleCourse({ id: "cf2", lessonIds: ["l3"] }),
      ];
      const result = getCourseForLesson("l3");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("cf2");
    });

    it("returns null when lesson is not in any course", () => {
      coursesStore = [makeSampleCourse({ id: "cf3", lessonIds: ["l1"] })];
      const result = getCourseForLesson("orphan");
      expect(result).toBeNull();
    });
  });
});
