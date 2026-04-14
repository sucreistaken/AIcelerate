import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Lesson } from "../../services/lessonDataService";

// In-memory store for lessons and memory
let lessonsStore: Lesson[] = [];
let memoryStore: any = {
  recurringConcepts: [],
  recentEmphases: [],
  lastUpdated: new Date().toISOString(),
};

// Mock GlobalMemory model (replaces file-Handler mock)
vi.mock("../../models/GlobalMemory", () => ({
  GlobalMemoryModel: {
    findOne: vi.fn(() => ({
      lean: vi.fn(() => Promise.resolve(memoryStore)),
    })),
    findOneAndUpdate: vi.fn((_filter: any, update: any) => {
      if (update?.$set) {
        Object.assign(memoryStore, update.$set);
      }
      return Promise.resolve(memoryStore);
    }),
  },
}));

// Mock logger to suppress warnings
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })) },
}));

// Mock the cache module — factory must be self-contained (no external refs)
vi.mock("../../cache", () => {
  // Use a module-level ref that tests can swap via the exported getter
  const _store = { lessons: [] as any[] };
  return {
    lessonCache: {
      getAll: () => _store.lessons,
      get: (id: string) => _store.lessons.find((l: any) => l.id === id) ?? null,
      set: (item: any) => {
        const idx = _store.lessons.findIndex((l: any) => l.id === item.id);
        if (idx >= 0) _store.lessons[idx] = item;
        else _store.lessons.push(item);
      },
      setAll: (items: any[]) => { _store.lessons = items; },
      delete: (id: string) => {
        const idx = _store.lessons.findIndex((l: any) => l.id === id);
        if (idx < 0) return false;
        _store.lessons.splice(idx, 1);
        return true;
      },
      find: (pred: any) => _store.lessons.find(pred) ?? null,
      filter: (pred: any) => _store.lessons.filter(pred),
      count: () => _store.lessons.length,
      flush: vi.fn(),
      _store, // expose for test setup
    },
    courseCache: { getAll: () => [], find: () => null },
    invalidateLessonCaches: vi.fn(),
    invalidateFlashcardCaches: vi.fn(),
    flushAllCaches: vi.fn(),
  };
});

// Import directly from service (canonical location)
import {
  listLessons,
  getLesson,
  upsertLesson,
  deleteLesson,
  updateProgress,
  addLesson,
  attachQuizPack,
  setQuizScore,
} from "../../services/lessonDataService";

import { lessonCache } from "../../cache";

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
    // Reset the internal store via the exposed ref
    (lessonCache as any)._store.lessons = [];
    lessonsStore = (lessonCache as any)._store.lessons;
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
      (lessonCache as any)._store.lessons = [makeSampleLesson({ id: "lec-1" }), makeSampleLesson({ id: "lec-2" })];
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
      (lessonCache as any)._store.lessons = [makeSampleLesson({ id: "lec-42", title: "Calculus" })];
      const result = getLesson("lec-42");
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Calculus");
    });

    it("returns null when id does not match any lesson", () => {
      (lessonCache as any)._store.lessons = [makeSampleLesson({ id: "lec-1" })];
      expect(getLesson("lec-999")).toBeNull();
    });
  });

  describe("upsertLesson", () => {
    it("creates a new lesson when id is not provided", async () => {
      const result = await upsertLesson({ title: "New Lecture", transcript: "Hello" });
      expect(result.id).toMatch(/^lec-/);
      expect(result.title).toBe("New Lecture");
      expect(result.transcript).toBe("Hello");
      expect((lessonCache as any)._store.lessons).toHaveLength(1);
    });

    it("creates a new lesson when id is provided but not found", async () => {
      const result = await upsertLesson({ id: "lec-new", title: "Brand New" });
      expect(result.id).toBe("lec-new");
      expect(result.title).toBe("Brand New");
      expect((lessonCache as any)._store.lessons).toHaveLength(1);
    });

    it("updates an existing lesson when id matches", async () => {
      (lessonCache as any)._store.lessons = [makeSampleLesson({ id: "lec-1", title: "Old Title" })];
      const result = await upsertLesson({ id: "lec-1", title: "New Title" });
      expect(result.id).toBe("lec-1");
      expect(result.title).toBe("New Title");
      expect((lessonCache as any)._store.lessons).toHaveLength(1);
    });

    it("preserves existing fields when updating", async () => {
      (lessonCache as any)._store.lessons = [makeSampleLesson({ id: "lec-1", transcript: "Keep this" })];
      const result = await upsertLesson({ id: "lec-1", title: "Updated" });
      expect(result.transcript).toBe("Keep this");
    });

    it("merges progress on update", async () => {
      (lessonCache as any)._store.lessons = [
        makeSampleLesson({ id: "lec-1", progress: { lastMode: "quiz", percent: 50 } }),
      ];
      const result = await upsertLesson({ id: "lec-1", progress: { percent: 80 } });
      expect(result.progress).toEqual({ lastMode: "quiz", percent: 80 });
    });

    it("sets default values for new lesson without optional fields", async () => {
      const result = await upsertLesson({});
      expect(result.title).toBe("Untitled Lecture");
      expect(result.transcript).toBe("");
      expect(result.slideText).toBe("");
      expect(result.highlights).toEqual([]);
    });

    it("updates global memory with highlights", async () => {
      await upsertLesson({
        id: "lec-mem",
        title: "Memory Test",
        highlights: ["Important concept"],
      });
      expect(memoryStore.recurringConcepts).toContain("Important concept");
    });

    it("updates global memory with professor emphases", async () => {
      await upsertLesson({
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
      (lessonCache as any)._store.lessons = [makeSampleLesson({ id: "lec-del" })];
      const result = deleteLesson("lec-del");
      expect(result).toBe(true);
      expect((lessonCache as any)._store.lessons).toHaveLength(0);
    });

    it("only removes the targeted lesson", () => {
      (lessonCache as any)._store.lessons = [
        makeSampleLesson({ id: "lec-1" }),
        makeSampleLesson({ id: "lec-2" }),
        makeSampleLesson({ id: "lec-3" }),
      ];
      deleteLesson("lec-2");
      const store = (lessonCache as any)._store.lessons;
      expect(store).toHaveLength(2);
      expect(store.map((l: any) => l.id)).toEqual(["lec-1", "lec-3"]);
    });
  });

  describe("updateProgress", () => {
    it("returns null when lesson does not exist", () => {
      expect(updateProgress("nonexistent", { percent: 50 })).toBeNull();
    });

    it("updates progress on an existing lesson", () => {
      (lessonCache as any)._store.lessons = [makeSampleLesson({ id: "lec-prog" })];
      const result = updateProgress("lec-prog", { lastMode: "quiz", percent: 75 });
      expect(result).not.toBeNull();
      expect(result!.progress).toEqual({ lastMode: "quiz", percent: 75 });
    });

    it("merges with existing progress", () => {
      (lessonCache as any)._store.lessons = [
        makeSampleLesson({ id: "lec-merge", progress: { lastMode: "summary", percent: 30 } }),
      ];
      const result = updateProgress("lec-merge", { percent: 60 });
      expect(result!.progress).toEqual({ lastMode: "summary", percent: 60 });
    });

    it("sets updatedAt timestamp", () => {
      (lessonCache as any)._store.lessons = [makeSampleLesson({ id: "lec-ts", updatedAt: "2020-01-01T00:00:00.000Z" })];
      const result = updateProgress("lec-ts", { percent: 10 });
      expect(result!.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
    });
  });

  describe("addLesson", () => {
    it("adds a lesson and returns it with timestamps", async () => {
      const lesson = makeSampleLesson({ id: "lec-add" });
      const result = await addLesson(lesson);
      expect(result.id).toBe("lec-add");
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect((lessonCache as any)._store.lessons).toHaveLength(1);
    });
  });

  describe("attachQuizPack", () => {
    it("attaches a quiz pack to an existing lesson", () => {
      (lessonCache as any)._store.lessons = [makeSampleLesson({ id: "lec-qp" })];
      attachQuizPack("lec-qp", "pack-1");
      const store = (lessonCache as any)._store.lessons;
      expect(store[0].quizPacks).toHaveLength(1);
      expect(store[0].quizPacks![0].packId).toBe("pack-1");
    });

    it("does nothing for nonexistent lesson", () => {
      attachQuizPack("nonexistent", "pack-1");
      expect((lessonCache as any)._store.lessons).toHaveLength(0);
    });
  });

  describe("setQuizScore", () => {
    it("sets the score on a matching quiz pack", () => {
      (lessonCache as any)._store.lessons = [
        makeSampleLesson({
          id: "lec-qs",
          quizPacks: [{ packId: "pack-1", createdAt: "2026-01-01T00:00:00.000Z" }],
        }),
      ];
      setQuizScore("lec-qs", "pack-1", 0.85);
      const store = (lessonCache as any)._store.lessons;
      expect(store[0].quizPacks![0].lastScore).toBe(0.85);
    });
  });
});
