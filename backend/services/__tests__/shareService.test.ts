import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock idGenerator ────────────────────────────────────────────────────────
let idCounter = 0;
vi.mock("../../utils/idGenerator", () => ({
  generateId: (prefix?: string) => `${prefix}-mock-${++idCounter}`,
}));

// ── Mock ShareModel ─────────────────────────────────────────────────────────
const mockCreate = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockFindByIdAndDelete = vi.fn();
const mockFindOneAndDelete = vi.fn();
const mockFind = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock("../../models/Share", () => ({
  ShareModel: {
    create: (...args: any[]) => mockCreate(...args),
    findByIdAndUpdate: (...args: any[]) => mockFindByIdAndUpdate(...args),
    findByIdAndDelete: (...args: any[]) => mockFindByIdAndDelete(...args),
    findOneAndDelete: (...args: any[]) => mockFindOneAndDelete(...args),
    find: (...args: any[]) => mockFind(...args),
    deleteMany: (...args: any[]) => mockDeleteMany(...args),
  },
}));

// ── Mock lessonControllers ──────────────────────────────────────────────────
const mockGetLesson = vi.fn();

vi.mock("../../services/lessonDataService", () => ({
  getLesson: (...args: any[]) => mockGetLesson(...args),
}));

// ── Mock weaknessController ─────────────────────────────────────────────────
const mockGetWeaknessForLesson = vi.fn();

vi.mock("../../services/weaknessService", () => ({
  weaknessService: {
    getWeaknessForLesson: (...args: any[]) => mockGetWeaknessForLesson(...args),
  },
}));

import { shareService } from "../shareService";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeShareDoc(overrides: Record<string, any> = {}) {
  return {
    _id: overrides._id ?? "share-mock-1",
    createdBy: overrides.createdBy ?? "user-1",
    lessonId: overrides.lessonId ?? "lesson-1",
    createdAt: overrides.createdAt ?? new Date("2025-06-01"),
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    bundle: overrides.bundle ?? {
      title: "Test Lesson",
      plan: null,
      cheatSheet: null,
      quiz: [],
      loModules: null,
      emphases: [],
      notes: [],
      weakTopics: [],
    },
    comments: overrides.comments ?? [],
    accessCount: overrides.accessCount ?? 0,
    ...overrides,
  };
}

function makeLesson(overrides: Record<string, any> = {}) {
  return {
    title: "Calculus 101",
    plan: { topics: ["limits"] },
    cheatSheet: { content: "formulas" },
    quizPacks: [{ packId: "quiz-1", createdAt: "2025-01-01" }],
    loModules: { modules: [{ loId: "lo-1" }] },
    professorEmphases: [{ statement: "Focus on limits" }],
    ...overrides,
  };
}

// Chainable .lean() / .sort() support
function chainable(doc: any) {
  const chain: any = {
    lean: vi.fn().mockResolvedValue(doc),
    sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(doc) }),
  };
  return chain;
}

describe("shareService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    idCounter = 0;
    // Default: cleanExpired does nothing problematic
    mockDeleteMany.mockResolvedValue({ deletedCount: 0 });
  });

  // ── createShare ───────────────────────────────────────────────────────

  describe("createShare()", () => {
    it("creates share with expiry from lesson data", async () => {
      const lesson = makeLesson();
      mockGetLesson.mockReturnValue(lesson);
      mockGetWeaknessForLesson.mockReturnValue({ topics: [{ topicName: "limits", ratio: 0.3 }] });

      const doc = makeShareDoc();
      mockCreate.mockResolvedValue(doc);

      const result = await shareService.createShare("lesson-1", "user-1");

      expect(result).not.toBeNull();
      expect(result!.shareId).toBe(doc._id);
      expect(result!.createdBy).toBe("user-1");
      expect(result!.lessonId).toBe("lesson-1");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.stringContaining("share-"),
          createdBy: "user-1",
          lessonId: "lesson-1",
          comments: [],
          accessCount: 0,
        })
      );
    });

    it("returns null when lesson not found", async () => {
      mockGetLesson.mockReturnValue(null);

      const result = await shareService.createShare("nonexistent");

      expect(result).toBeNull();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("cleans expired shares before creating", async () => {
      mockGetLesson.mockReturnValue(makeLesson());
      mockGetWeaknessForLesson.mockReturnValue(null);
      mockCreate.mockResolvedValue(makeShareDoc());

      await shareService.createShare("lesson-1");

      expect(mockDeleteMany).toHaveBeenCalledWith({
        expiresAt: { $lte: expect.any(String) },
      });
    });

    it("defaults createdBy to anonymous", async () => {
      mockGetLesson.mockReturnValue(makeLesson());
      mockGetWeaknessForLesson.mockReturnValue(null);
      mockCreate.mockResolvedValue(makeShareDoc({ createdBy: "anonymous" }));

      const result = await shareService.createShare("lesson-1");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: "anonymous" })
      );
      expect(result!.createdBy).toBe("anonymous");
    });
  });

  // ── getShare ──────────────────────────────────────────────────────────

  describe("getShare()", () => {
    it("returns share and increments access count", async () => {
      const doc = makeShareDoc({ accessCount: 5 });
      mockFindByIdAndUpdate.mockReturnValue(chainable(doc));

      const result = await shareService.getShare("share-mock-1");

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        "share-mock-1",
        { $inc: { accessCount: 1 } },
        { new: true }
      );
      expect(result).not.toBeNull();
      expect(result!.shareId).toBe("share-mock-1");
      expect(result!.accessCount).toBe(5);
    });

    it("returns null for expired/deleted share", async () => {
      mockFindByIdAndUpdate.mockReturnValue(chainable(null));

      const result = await shareService.getShare("nonexistent");

      expect(result).toBeNull();
    });
  });

  // ── addComment ────────────────────────────────────────────────────────

  describe("addComment()", () => {
    it("adds comment to share", async () => {
      const doc = makeShareDoc({
        comments: [{ author: "user-2", text: "Nice!", createdAt: "2025-06-01" }],
      });
      mockFindByIdAndUpdate.mockReturnValue(chainable(doc));

      const result = await shareService.addComment("share-mock-1", "user-2", "Nice!");

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        "share-mock-1",
        {
          $push: {
            comments: expect.objectContaining({
              author: "user-2",
              text: "Nice!",
            }),
          },
        },
        { new: true }
      );
      expect(result).not.toBeNull();
      expect(result!.comments).toHaveLength(1);
    });

    it("returns null if share not found", async () => {
      mockFindByIdAndUpdate.mockReturnValue(chainable(null));

      const result = await shareService.addComment("nonexistent", "user-1", "Hello");

      expect(result).toBeNull();
    });

    it("defaults author to anonymous when empty", async () => {
      const doc = makeShareDoc({
        comments: [{ author: "anonymous", text: "Hi", createdAt: "2025-06-01" }],
      });
      mockFindByIdAndUpdate.mockReturnValue(chainable(doc));

      await shareService.addComment("share-mock-1", "", "Hi");

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        "share-mock-1",
        {
          $push: {
            comments: expect.objectContaining({ author: "anonymous" }),
          },
        },
        { new: true }
      );
    });
  });

  // ── listShares ────────────────────────────────────────────────────────

  describe("listShares()", () => {
    it("returns all non-expired shares", async () => {
      const docs = [makeShareDoc({ _id: "s1" }), makeShareDoc({ _id: "s2" })];
      mockFind.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(docs),
        }),
      });

      const result = await shareService.listShares("user-1");

      expect(result).toHaveLength(2);
      expect(result[0].shareId).toBe("s1");
      expect(result[1].shareId).toBe("s2");
      expect(mockDeleteMany).toHaveBeenCalled(); // cleanExpired called
    });
  });

  // ── deleteShare ───────────────────────────────────────────────────────

  describe("deleteShare()", () => {
    it("removes share and returns true", async () => {
      mockFindOneAndDelete.mockResolvedValue(makeShareDoc());

      const result = await shareService.deleteShare("share-mock-1", "user-1");

      expect(result).toBe(true);
      expect(mockFindOneAndDelete).toHaveBeenCalledWith({ _id: "share-mock-1", createdBy: "user-1" });
    });

    it("returns false when share not found", async () => {
      mockFindOneAndDelete.mockResolvedValue(null);

      const result = await shareService.deleteShare("nonexistent", "user-1");

      expect(result).toBe(false);
    });
  });

  // ── cleanExpired ──────────────────────────────────────────────────────

  describe("cleanExpired()", () => {
    it("removes expired shares", async () => {
      mockDeleteMany.mockResolvedValue({ deletedCount: 3 });

      await shareService.cleanExpired();

      expect(mockDeleteMany).toHaveBeenCalledWith({
        expiresAt: { $lte: expect.any(String) },
      });
    });
  });

  // ── toBundle ──────────────────────────────────────────────────────────

  describe("toBundle()", () => {
    it("converts doc to SharedBundle shape with defaults", () => {
      const result = shareService.toBundle({
        _id: "s-1",
        createdAt: new Date("2025-01-01"),
        expiresAt: "2025-01-08",
        createdBy: "user-1",
        lessonId: "l-1",
        bundle: null,
        comments: null,
        accessCount: null,
      });

      expect(result.shareId).toBe("s-1");
      expect(result.createdAt).toBe("2025-01-01T00:00:00.000Z");
      expect(result.bundle).toBeDefined();
      expect(result.comments).toEqual([]);
      expect(result.accessCount).toBe(0);
    });
  });
});
