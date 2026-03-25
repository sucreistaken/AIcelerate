import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Lesson } from "../lessonControllers";

// In-memory store for lessons and memory
let lessonsStore: Lesson[] = [];
let memoryStore: any = {
  recurringConcepts: [],
  recentEmphases: [],
  lastUpdated: new Date().toISOString(),
};

vi.mock("../../utils/file-Handler", () => ({
  readJSON: vi.fn((filePath: string) => {
    if (filePath.includes("memory.json")) return memoryStore;
    return null;
  }),
  writeJSON: vi.fn((filePath: string, data: any) => {
    if (filePath.includes("memory.json")) memoryStore = data;
  }),
  ensureDataFiles: vi.fn(),
}));

vi.mock("../../repositories/lessonRepo", () => ({
  lessonRepo: {
    findAllSync: vi.fn(() => lessonsStore),
    saveAllSync: vi.fn((data: any) => { lessonsStore = data; }),
  },
}));

// Import after mocks are set up
import {
  listLessons,
  getLesson,
  upsertLesson,
  deleteLesson,
  updateProgress,
  addLesson,
  attachQuizPack,
  setQuizScore,
} from "../lessonControllers";

function makeSampleLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "lec-test-1",
    title: "Test Lecture",
    date: "2026-01-01T00:00:00.000Z",
    transcript: "Sample transcript",
    slideText: "Sample slide text",
    highlights: [],
    professorEmphases: [],
    quiz: [],
    quizPacks: [],
    progress: { lastMode: "alignment", percent: 0 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("lessonControllers", () => {
  beforeEach(() => {
    lessonsStore = [];
    memoryStore = {
      recurringConcepts: [],
      recentEmphases: [],
      lastUpdated: new Date().toISOString(),
    };
  });

  describe("listLessons", () => {
    it("returns empty array when no lessons exist", () => {
      expect(listLessons()).toEqual([]);
    });

    it("returns all stored lessons", () => {
      lessonsStore = [makeSampleLesson({ id: "lec-1" }), makeSampleLesson({ id: "lec-2" })];
      const result = listLessons();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("lec-1");
      expect(result[1].id).toBe("lec-2");
    });
  });

  describe("getLesson", () => {
    it("returns null when lesson does not exist", () => {
      expect(getLesson("nonexistent")).toBeNull();
    });

    it("returns the correct lesson by id", () => {
      lessonsStore = [makeSampleLesson({ id: "lec-42", title: "Calculus" })];
      const result = getLesson("lec-42");
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Calculus");
    });

    it("returns null when id does not match any lesson", () => {
      lessonsStore = [makeSampleLesson({ id: "lec-1" })];
      expect(getLesson("lec-999")).toBeNull();
    });
  });

  describe("upsertLesson", () => {
    it("creates a new lesson when id is not provided", () => {
      const result = upsertLesson({ title: "New Lecture", transcript: "Hello" });
      expect(result.id).toMatch(/^lec-/);
      expect(result.title).toBe("New Lecture");
      expect(result.transcript).toBe("Hello");
      expect(lessonsStore).toHaveLength(1);
    });

    it("creates a new lesson when id is provided but not found", () => {
      const result = upsertLesson({ id: "lec-new", title: "Brand New" });
      expect(result.id).toBe("lec-new");
      expect(result.title).toBe("Brand New");
      expect(lessonsStore).toHaveLength(1);
    });

    it("updates an existing lesson when id matches", () => {
      lessonsStore = [makeSampleLesson({ id: "lec-1", title: "Old Title" })];
      const result = upsertLesson({ id: "lec-1", title: "New Title" });
      expect(result.id).toBe("lec-1");
      expect(result.title).toBe("New Title");
      expect(lessonsStore).toHaveLength(1);
    });

    it("preserves existing fields when updating", () => {
      lessonsStore = [makeSampleLesson({ id: "lec-1", transcript: "Keep this" })];
      const result = upsertLesson({ id: "lec-1", title: "Updated" });
      expect(result.transcript).toBe("Keep this");
    });

    it("merges progress on update", () => {
      lessonsStore = [
        makeSampleLesson({ id: "lec-1", progress: { lastMode: "quiz", percent: 50 } }),
      ];
      const result = upsertLesson({ id: "lec-1", progress: { percent: 80 } });
      expect(result.progress).toEqual({ lastMode: "quiz", percent: 80 });
    });

    it("sets default values for new lesson without optional fields", () => {
      const result = upsertLesson({});
      expect(result.title).toBe("Untitled Lecture");
      expect(result.transcript).toBe("");
      expect(result.slideText).toBe("");
      expect(result.highlights).toEqual([]);
    });

    it("updates global memory with highlights", () => {
      upsertLesson({
        id: "lec-mem",
        title: "Memory Test",
        highlights: ["Important concept"],
      });
      expect(memoryStore.recurringConcepts).toContain("Important concept");
    });

    it("updates global memory with professor emphases", () => {
      upsertLesson({
        id: "lec-emph",
        title: "Emphasis Test",
        professorEmphases: [
          { statement: "Key point", why: "Exam material", in_slides: true, evidence: "p.5", confidence: 0.9 },
        ],
      });
      expect(memoryStore.recentEmphases).toHaveLength(1);
      expect(memoryStore.recentEmphases[0].statement).toBe("Key point");
    });
  });

  describe("deleteLesson", () => {
    it("returns false when lesson does not exist", () => {
      expect(deleteLesson("nonexistent")).toBe(false);
    });

    it("removes the lesson and returns true", () => {
      lessonsStore = [makeSampleLesson({ id: "lec-del" })];
      const result = deleteLesson("lec-del");
      expect(result).toBe(true);
      expect(lessonsStore).toHaveLength(0);
    });

    it("only removes the targeted lesson", () => {
      lessonsStore = [
        makeSampleLesson({ id: "lec-1" }),
        makeSampleLesson({ id: "lec-2" }),
        makeSampleLesson({ id: "lec-3" }),
      ];
      deleteLesson("lec-2");
      expect(lessonsStore).toHaveLength(2);
      expect(lessonsStore.map((l) => l.id)).toEqual(["lec-1", "lec-3"]);
    });
  });

  describe("updateProgress", () => {
    it("returns null when lesson does not exist", () => {
      expect(updateProgress("nonexistent", { percent: 50 })).toBeNull();
    });

    it("updates progress on an existing lesson", () => {
      lessonsStore = [makeSampleLesson({ id: "lec-prog" })];
      const result = updateProgress("lec-prog", { lastMode: "quiz", percent: 75 });
      expect(result).not.toBeNull();
      expect(result!.progress).toEqual({ lastMode: "quiz", percent: 75 });
    });

    it("merges with existing progress", () => {
      lessonsStore = [
        makeSampleLesson({ id: "lec-merge", progress: { lastMode: "summary", percent: 30 } }),
      ];
      const result = updateProgress("lec-merge", { percent: 60 });
      expect(result!.progress).toEqual({ lastMode: "summary", percent: 60 });
    });

    it("sets updatedAt timestamp", () => {
      lessonsStore = [makeSampleLesson({ id: "lec-ts", updatedAt: "2020-01-01T00:00:00.000Z" })];
      const result = updateProgress("lec-ts", { percent: 10 });
      expect(result!.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    });
  });

  describe("addLesson", () => {
    it("adds a lesson and returns it with timestamps", () => {
      const lesson = makeSampleLesson({ id: "lec-add" });
      const result = addLesson(lesson);
      expect(result.id).toBe("lec-add");
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(lessonsStore).toHaveLength(1);
    });
  });

  describe("attachQuizPack", () => {
    it("attaches a quiz pack to an existing lesson", () => {
      lessonsStore = [makeSampleLesson({ id: "lec-qp" })];
      attachQuizPack("lec-qp", "pack-1");
      expect(lessonsStore[0].quizPacks).toHaveLength(1);
      expect(lessonsStore[0].quizPacks![0].packId).toBe("pack-1");
    });

    it("does nothing for nonexistent lesson", () => {
      attachQuizPack("nonexistent", "pack-1");
      expect(lessonsStore).toHaveLength(0);
    });
  });

  describe("setQuizScore", () => {
    it("sets the score on a matching quiz pack", () => {
      lessonsStore = [
        makeSampleLesson({
          id: "lec-qs",
          quizPacks: [{ packId: "pack-1", createdAt: "2026-01-01T00:00:00.000Z" }],
        }),
      ];
      setQuizScore("lec-qs", "pack-1", 0.85);
      expect(lessonsStore[0].quizPacks![0].lastScore).toBe(0.85);
    });
  });
});
