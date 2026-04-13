import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Flashcard, ReviewEntry } from "../flashcardService";

// ── Hoisted env vars ────────────────────────────────────────────────
vi.hoisted(() => {
  process.env.NODE_ENV = "test";
  process.env.GEMINI_API_KEY = "test-key";
});

// ── Mock: idGenerator ───────────────────────────────────────────────
let idCounter = 0;
vi.mock("../../utils/idGenerator", () => ({
  generateId: vi.fn((prefix?: string) => {
    idCounter++;
    return prefix ? `${prefix}-test-${idCounter}` : `test-${idCounter}`;
  }),
}));

// ── Mock: flashcard cache ───────────────────────────────────────────
const mockCacheGet = vi.fn<(key: string) => Flashcard | null>();
const mockCacheGetAll = vi.fn<() => Flashcard[]>();
const mockCacheSet = vi.fn<(item: Flashcard) => void>();
const mockCacheSetAll = vi.fn<(items: Flashcard[]) => void>();
const mockCacheDelete = vi.fn<(key: string) => boolean>();
const mockCacheFilter = vi.fn<(pred: (c: Flashcard) => boolean) => Flashcard[]>();
const mockCacheGetByIndex = vi.fn<(field: string, value: string) => Flashcard[]>();

vi.mock("../../cache", () => ({
  flashcardCache: {
    get: (...args: unknown[]) => mockCacheGet(args[0] as string),
    getAll: () => mockCacheGetAll(),
    set: (item: unknown) => mockCacheSet(item as Flashcard),
    setAll: (items: unknown) => mockCacheSetAll(items as Flashcard[]),
    delete: (...args: unknown[]) => mockCacheDelete(args[0] as string),
    filter: (pred: unknown) => mockCacheFilter(pred as (c: Flashcard) => boolean),
    getByIndex: (...args: unknown[]) =>
      mockCacheGetByIndex(args[0] as string, args[1] as string),
  },
  invalidateFlashcardCaches: vi.fn(),
}));

// ── Mock: lessonDataService ─────────────────────────────────────────
const mockGetLesson = vi.fn();
vi.mock("../lessonDataService", () => ({
  getLesson: (...args: unknown[]) => mockGetLesson(...args),
}));

// ── Import SUT after mocks ──────────────────────────────────────────
import { flashcardService } from "../flashcardService";
import { invalidateFlashcardCaches } from "../../cache";

// ── Helpers ─────────────────────────────────────────────────────────
function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: "fc-existing-1",
    lessonId: "lesson-1",
    topicName: "Test Topic",
    front: "What is X?",
    back: "X is Y",
    source: "emphasis",
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewDate: new Date().toISOString(),
    state: "new",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Setup ───────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  idCounter = 0;
  mockCacheGetAll.mockReturnValue([]);
  mockCacheGetByIndex.mockReturnValue([]);
  mockCacheFilter.mockReturnValue([]);
});

// =====================================================================
// Tests
// =====================================================================

describe("flashcardService", () => {
  // ── loadAll ─────────────────────────────────────────────────────
  describe("loadAll", () => {
    it("should return all flashcards from cache", () => {
      const cards = [makeCard(), makeCard({ id: "fc-2" })];
      mockCacheGetAll.mockReturnValue(cards);

      const result = flashcardService.loadAll();

      expect(mockCacheGetAll).toHaveBeenCalledOnce();
      expect(result).toEqual(cards);
    });

    it("should return empty array when no flashcards exist", () => {
      mockCacheGetAll.mockReturnValue([]);

      const result = flashcardService.loadAll();

      expect(result).toEqual([]);
    });
  });

  // ── saveAll ─────────────────────────────────────────────────────
  describe("saveAll", () => {
    it("should overwrite cache and invalidate caches", () => {
      const cards = [makeCard(), makeCard({ id: "fc-2" })];

      flashcardService.saveAll(cards);

      expect(mockCacheSetAll).toHaveBeenCalledWith(cards);
      expect(invalidateFlashcardCaches).toHaveBeenCalledOnce();
    });
  });

  // ── create ──────────────────────────────────────────────────────
  describe("create", () => {
    it("should return a new flashcard with correct fields", () => {
      const card = flashcardService.create(
        "lesson-1",
        "Topic A",
        "Front text",
        "Back text",
        "emphasis"
      );

      expect(card.id).toMatch(/^fc-/);
      expect(card.lessonId).toBe("lesson-1");
      expect(card.topicName).toBe("Topic A");
      expect(card.front).toBe("Front text");
      expect(card.back).toBe("Back text");
      expect(card.source).toBe("emphasis");
      expect(card.interval).toBe(0);
      expect(card.easeFactor).toBe(2.5);
      expect(card.repetitions).toBe(0);
      expect(card.state).toBe("new");
    });

    it("should set nextReviewDate and createdAt to current time", () => {
      const before = new Date().toISOString();
      const card = flashcardService.create("l-1", "T", "F", "B", "cheatsheet");
      const after = new Date().toISOString();

      expect(card.nextReviewDate >= before).toBe(true);
      expect(card.nextReviewDate <= after).toBe(true);
      expect(card.createdAt >= before).toBe(true);
      expect(card.createdAt <= after).toBe(true);
    });

    it("should generate unique IDs for each card", () => {
      const c1 = flashcardService.create("l", "t", "f1", "b1", "emphasis");
      const c2 = flashcardService.create("l", "t", "f2", "b2", "emphasis");

      expect(c1.id).not.toBe(c2.id);
    });
  });

  // ── SM-2 Algorithm (review) ─────────────────────────────────────
  describe("review (SM-2 algorithm)", () => {
    it("should return null when card not found", () => {
      mockCacheGet.mockReturnValue(null);

      const result = flashcardService.review("nonexistent", 4);

      expect(result).toBeNull();
    });

    // ── quality < 3: resets interval ────────────────────────────
    describe("quality < 3 (failed review)", () => {
      it("should reset repetitions to 0 and interval to 1", () => {
        const card = makeCard({ repetitions: 5, interval: 30, state: "review" });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 2);

        expect(result).not.toBeNull();
        expect(result!.card.repetitions).toBe(0);
        expect(result!.card.interval).toBe(1);
      });

      it("should set state to learning", () => {
        const card = makeCard({ repetitions: 3, interval: 15, state: "review" });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 1);

        expect(result!.card.state).toBe("learning");
      });

      it("should decrease ease factor but not below 1.3", () => {
        const card = makeCard({ easeFactor: 2.5 });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 0);

        // SM-2 formula: EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
        // q=0: EF' = 2.5 + (0.1 - 5*(0.08 + 5*0.02)) = 2.5 + (0.1 - 5*0.18) = 2.5 + (0.1 - 0.9) = 2.5 - 0.8 = 1.7
        expect(result!.card.easeFactor).toBeCloseTo(1.7, 5);
      });

      it("should clamp ease factor to minimum 1.3", () => {
        const card = makeCard({ easeFactor: 1.3 });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 0);

        // EF' = 1.3 + (0.1 - 0.9) = 1.3 - 0.8 = 0.5 → clamped to 1.3
        expect(result!.card.easeFactor).toBe(1.3);
      });

      it("should record previousInterval in review entry", () => {
        const card = makeCard({ interval: 20 });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 2);

        expect(result!.reviewEntry.previousInterval).toBe(20);
        expect(result!.reviewEntry.newInterval).toBe(1);
        expect(result!.reviewEntry.quality).toBe(2);
      });

      it("should set nextReviewDate to 1 day in the future", () => {
        const card = makeCard({ interval: 10 });
        mockCacheGet.mockReturnValue(card);

        const before = Date.now();
        const result = flashcardService.review(card.id, 1);
        const after = Date.now();

        const nextDate = new Date(result!.card.nextReviewDate).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        expect(nextDate).toBeGreaterThanOrEqual(before + oneDayMs);
        expect(nextDate).toBeLessThanOrEqual(after + oneDayMs);
      });
    });

    // ── quality >= 3: extends interval ──────────────────────────
    describe("quality >= 3 (successful review)", () => {
      it("should set interval to 1 on first successful review (repetitions 0 -> 1)", () => {
        const card = makeCard({ repetitions: 0, interval: 0 });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 4);

        expect(result!.card.repetitions).toBe(1);
        expect(result!.card.interval).toBe(1);
      });

      it("should set interval to 6 on second successful review (repetitions 1 -> 2)", () => {
        const card = makeCard({ repetitions: 1, interval: 1 });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 3);

        expect(result!.card.repetitions).toBe(2);
        expect(result!.card.interval).toBe(6);
      });

      it("should multiply interval by easeFactor on third+ review", () => {
        const card = makeCard({ repetitions: 2, interval: 6, easeFactor: 2.5 });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 4);

        expect(result!.card.repetitions).toBe(3);
        // 6 * 2.5 = 15
        expect(result!.card.interval).toBe(15);
      });

      it("should round interval when multiplying by easeFactor", () => {
        const card = makeCard({ repetitions: 3, interval: 15, easeFactor: 2.3 });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 5);

        // 15 * 2.3 = 34.5 → rounded to 35
        expect(result!.card.interval).toBe(Math.round(15 * 2.3));
      });

      it("should NOT modify ease factor on successful review", () => {
        const card = makeCard({ easeFactor: 2.5 });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 5);

        expect(result!.card.easeFactor).toBe(2.5);
      });

      it("should set state to review for repetitions < 8", () => {
        const card = makeCard({ repetitions: 4, interval: 6 });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 3);

        expect(result!.card.state).toBe("review");
      });

      it("should set state to graduated when repetitions reach 8", () => {
        const card = makeCard({ repetitions: 7, interval: 60 });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 4);

        expect(result!.card.repetitions).toBe(8);
        expect(result!.card.state).toBe("graduated");
      });

      it("should set nextReviewDate based on computed interval", () => {
        const card = makeCard({ repetitions: 2, interval: 6, easeFactor: 2.5 });
        mockCacheGet.mockReturnValue(card);

        const before = Date.now();
        const result = flashcardService.review(card.id, 4);
        const after = Date.now();

        const nextDate = new Date(result!.card.nextReviewDate).getTime();
        const expectedDays = 15; // 6 * 2.5
        const expectedMs = expectedDays * 24 * 60 * 60 * 1000;

        expect(nextDate).toBeGreaterThanOrEqual(before + expectedMs);
        expect(nextDate).toBeLessThanOrEqual(after + expectedMs);
      });
    });

    // ── common review behavior ──────────────────────────────────
    describe("common behavior", () => {
      it("should set lastReviewedAt to current time", () => {
        const card = makeCard();
        mockCacheGet.mockReturnValue(card);

        const before = new Date().toISOString();
        const result = flashcardService.review(card.id, 3);
        const after = new Date().toISOString();

        expect(result!.card.lastReviewedAt).toBeDefined();
        expect(result!.card.lastReviewedAt! >= before).toBe(true);
        expect(result!.card.lastReviewedAt! <= after).toBe(true);
      });

      it("should persist updated card to cache", () => {
        const card = makeCard();
        mockCacheGet.mockReturnValue(card);

        flashcardService.review(card.id, 3);

        expect(mockCacheSet).toHaveBeenCalledOnce();
        const saved = mockCacheSet.mock.calls[0][0];
        expect(saved.id).toBe(card.id);
      });

      it("should invalidate flashcard caches after review", () => {
        const card = makeCard();
        mockCacheGet.mockReturnValue(card);

        flashcardService.review(card.id, 4);

        expect(invalidateFlashcardCaches).toHaveBeenCalledOnce();
      });

      it("should not mutate the original cached card", () => {
        const card = makeCard({ repetitions: 3, interval: 10 });
        mockCacheGet.mockReturnValue(card);

        flashcardService.review(card.id, 4);

        // The original object should be unchanged (service spreads it)
        expect(card.repetitions).toBe(3);
        expect(card.interval).toBe(10);
      });

      it("should return correct reviewEntry shape", () => {
        const card = makeCard({ interval: 10 });
        mockCacheGet.mockReturnValue(card);

        const result = flashcardService.review(card.id, 3);

        const entry: ReviewEntry = result!.reviewEntry;
        expect(entry.cardId).toBe(card.id);
        expect(entry.quality).toBe(3);
        expect(entry.previousInterval).toBe(10);
        expect(typeof entry.newInterval).toBe("number");
        expect(typeof entry.reviewedAt).toBe("string");
      });
    });
  });

  // ── generateForLesson ───────────────────────────────────────────
  describe("generateForLesson", () => {
    it("should return empty array when lesson not found", () => {
      mockGetLesson.mockReturnValue(null);

      const result = flashcardService.generateForLesson("nonexistent");

      expect(result).toEqual([]);
    });

    it("should generate cards from emphases", () => {
      const lesson = {
        id: "lesson-1",
        plan: {
          emphases: [
            { statement: "Important concept A", why: "Because A", evidence: "Slide 3" },
            { statement: "Important concept B", why: "Because B", evidence: "Slide 5" },
          ],
        },
      };
      mockGetLesson.mockReturnValue(lesson);
      mockCacheGetByIndex.mockReturnValue([]);
      mockCacheGetAll.mockReturnValue([]);

      const result = flashcardService.generateForLesson("lesson-1");

      expect(result).toHaveLength(2);
      expect(result[0].front).toBe("Important concept A");
      expect(result[0].back).toContain("Because A");
      expect(result[0].back).toContain("Slide 3");
      expect(result[0].source).toBe("emphasis");
      expect(result[1].front).toBe("Important concept B");
    });

    it("should use professorEmphases as fallback when plan.emphases is absent", () => {
      const lesson = {
        id: "lesson-1",
        professorEmphases: [
          { statement: "Prof emphasis", why: "Critical", evidence: "Verbal" },
        ],
      };
      mockGetLesson.mockReturnValue(lesson);
      mockCacheGetByIndex.mockReturnValue([]);
      mockCacheGetAll.mockReturnValue([]);

      const result = flashcardService.generateForLesson("lesson-1");

      expect(result.some((c) => c.front === "Prof emphasis")).toBe(true);
    });

    it("should generate cards from cheatSheet quickQuiz", () => {
      const lesson = {
        id: "lesson-1",
        cheatSheet: {
          quickQuiz: [
            { q: "What is Q1?", a: "Answer 1" },
            { q: "What is Q2?", a: "Answer 2" },
          ],
        },
      };
      mockGetLesson.mockReturnValue(lesson);
      mockCacheGetByIndex.mockReturnValue([]);
      mockCacheGetAll.mockReturnValue([]);

      const result = flashcardService.generateForLesson("lesson-1");

      const quizCards = result.filter((c) => c.source === "cheatsheet");
      expect(quizCards).toHaveLength(2);
      expect(quizCards[0].front).toBe("What is Q1?");
      expect(quizCards[0].back).toBe("Answer 1");
      expect(quizCards[0].topicName).toBe("Cheat Sheet");
    });

    it("should generate cards from loModules miniQuiz", () => {
      const lesson = {
        id: "lesson-1",
        loModules: {
          modules: [
            {
              loId: "lo-1",
              loTitle: "Module Title",
              miniQuiz: [
                { question: "Mini Q1?", answer: "Mini A1", why: "Because mini" },
              ],
            },
          ],
        },
      };
      mockGetLesson.mockReturnValue(lesson);
      mockCacheGetByIndex.mockReturnValue([]);
      mockCacheGetAll.mockReturnValue([]);

      const result = flashcardService.generateForLesson("lesson-1");

      const miniCards = result.filter((c) => c.source === "miniQuiz");
      expect(miniCards).toHaveLength(1);
      expect(miniCards[0].front).toBe("Mini Q1?");
      expect(miniCards[0].back).toContain("Mini A1");
      expect(miniCards[0].back).toContain("Because mini");
      expect(miniCards[0].topicName).toBe("Module Title");
    });

    it("should generate fill-in-the-blank cards from mustRemember (>3 words)", () => {
      const lesson = {
        id: "lesson-1",
        loModules: {
          modules: [
            {
              loId: "lo-1",
              loTitle: "Module Title",
              mustRemember: ["The quick brown fox jumps"],
            },
          ],
        },
      };
      mockGetLesson.mockReturnValue(lesson);
      mockCacheGetByIndex.mockReturnValue([]);
      mockCacheGetAll.mockReturnValue([]);

      const result = flashcardService.generateForLesson("lesson-1");

      const loCards = result.filter((c) => c.source === "loModule");
      expect(loCards).toHaveLength(1);
      expect(loCards[0].front).toContain("Fill in the blank:");
      expect(loCards[0].front).toContain("______");
      // The blanked word is the middle one: "brown" (index 2 of 5 words)
      expect(loCards[0].back).toBe("brown");
    });

    it("should generate simple question cards from mustRemember (<=3 words)", () => {
      const lesson = {
        id: "lesson-1",
        loModules: {
          modules: [
            {
              loId: "lo-1",
              loTitle: "Module Title",
              mustRemember: ["DNA RNA"],
            },
          ],
        },
      };
      mockGetLesson.mockReturnValue(lesson);
      mockCacheGetByIndex.mockReturnValue([]);
      mockCacheGetAll.mockReturnValue([]);

      const result = flashcardService.generateForLesson("lesson-1");

      const loCards = result.filter((c) => c.source === "loModule");
      expect(loCards).toHaveLength(1);
      expect(loCards[0].front).toBe("What is: DNA RNA?");
      expect(loCards[0].back).toBe("DNA RNA");
    });

    it("should skip duplicate fronts from existing cards", () => {
      const existingCard = makeCard({ front: "Duplicate front", lessonId: "lesson-1" });
      const lesson = {
        id: "lesson-1",
        plan: {
          emphases: [
            { statement: "Duplicate front", why: "A", evidence: "B" },
            { statement: "New front", why: "C", evidence: "D" },
          ],
        },
      };
      mockGetLesson.mockReturnValue(lesson);
      mockCacheGetByIndex.mockReturnValue([existingCard]);
      mockCacheGetAll.mockReturnValue([existingCard]);

      const result = flashcardService.generateForLesson("lesson-1");

      expect(result).toHaveLength(1);
      expect(result[0].front).toBe("New front");
    });

    it("should skip duplicate fronts within the same generation batch", () => {
      const lesson = {
        id: "lesson-1",
        plan: {
          emphases: [
            { statement: "Same statement", why: "A", evidence: "B" },
          ],
        },
        cheatSheet: {
          quickQuiz: [{ q: "Same statement", a: "Answer" }],
        },
      };
      mockGetLesson.mockReturnValue(lesson);
      mockCacheGetByIndex.mockReturnValue([]);
      mockCacheGetAll.mockReturnValue([]);

      const result = flashcardService.generateForLesson("lesson-1");

      // "Same statement" appears in emphases AND quickQuiz, but only created once
      const matching = result.filter(
        (c) => c.front === "Same statement"
      );
      expect(matching).toHaveLength(1);
    });

    it("should batch-save new cards to cache and invalidate", () => {
      const lesson = {
        id: "lesson-1",
        plan: {
          emphases: [{ statement: "New card", why: "W", evidence: "E" }],
        },
      };
      mockGetLesson.mockReturnValue(lesson);
      mockCacheGetByIndex.mockReturnValue([]);
      mockCacheGetAll.mockReturnValue([]);

      flashcardService.generateForLesson("lesson-1");

      expect(mockCacheSetAll).toHaveBeenCalledOnce();
      expect(invalidateFlashcardCaches).toHaveBeenCalledOnce();
    });

    it("should not save or invalidate when no new cards generated", () => {
      const lesson = { id: "lesson-1" };
      mockGetLesson.mockReturnValue(lesson);
      mockCacheGetByIndex.mockReturnValue([]);

      const result = flashcardService.generateForLesson("lesson-1");

      expect(result).toHaveLength(0);
      expect(mockCacheSetAll).not.toHaveBeenCalled();
      expect(invalidateFlashcardCaches).not.toHaveBeenCalled();
    });

    it("should use loId as fallback topicName when loTitle is missing", () => {
      const lesson = {
        id: "lesson-1",
        loModules: {
          modules: [
            {
              loId: "lo-fallback-id",
              loTitle: "",
              miniQuiz: [
                { question: "Fallback Q?", answer: "A", why: "W" },
              ],
            },
          ],
        },
      };
      mockGetLesson.mockReturnValue(lesson);
      mockCacheGetByIndex.mockReturnValue([]);
      mockCacheGetAll.mockReturnValue([]);

      const result = flashcardService.generateForLesson("lesson-1");

      expect(result[0].topicName).toBe("lo-fallback-id");
    });
  });

  // ── getDueCards ─────────────────────────────────────────────────
  describe("getDueCards", () => {
    it("should return cards with nextReviewDate in the past, excluding graduated", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const dueCard = makeCard({ state: "review", nextReviewDate: pastDate });
      const graduatedCard = makeCard({
        id: "fc-grad",
        state: "graduated",
        nextReviewDate: pastDate,
      });

      mockCacheFilter.mockImplementation((pred: (c: Flashcard) => boolean) => {
        return [dueCard, graduatedCard].filter(pred);
      });

      const result = flashcardService.getDueCards();

      expect(result).toHaveLength(1);
      expect(result[0].state).toBe("review");
    });

    it("should sort results by nextReviewDate ascending", () => {
      const earlier = new Date(Date.now() - 172800000).toISOString();
      const later = new Date(Date.now() - 86400000).toISOString();
      const cardA = makeCard({ id: "fc-a", state: "learning", nextReviewDate: later });
      const cardB = makeCard({ id: "fc-b", state: "review", nextReviewDate: earlier });

      mockCacheFilter.mockImplementation((pred: (c: Flashcard) => boolean) => {
        return [cardA, cardB].filter(pred);
      });

      const result = flashcardService.getDueCards();

      expect(result[0].id).toBe("fc-b"); // earlier date first
      expect(result[1].id).toBe("fc-a");
    });

    it("should not return cards with future nextReviewDate", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const futureCard = makeCard({ state: "review", nextReviewDate: futureDate });

      mockCacheFilter.mockImplementation((pred: (c: Flashcard) => boolean) => {
        return [futureCard].filter(pred);
      });

      const result = flashcardService.getDueCards();

      expect(result).toHaveLength(0);
    });
  });

  // ── getByLessonId ───────────────────────────────────────────────
  describe("getByLessonId", () => {
    it("should return cards filtered by lessonId using cache index", () => {
      const cards = [makeCard({ lessonId: "lesson-1" })];
      mockCacheGetByIndex.mockReturnValue(cards);

      const result = flashcardService.getByLessonId("lesson-1");

      expect(mockCacheGetByIndex).toHaveBeenCalledWith("lessonId", "lesson-1");
      expect(result).toEqual(cards);
    });
  });

  // ── getAll ──────────────────────────────────────────────────────
  describe("getAll", () => {
    it("should return all flashcards when no lessonId provided", () => {
      const cards = [makeCard(), makeCard({ id: "fc-2" })];
      mockCacheGetAll.mockReturnValue(cards);

      const result = flashcardService.getAll();

      expect(mockCacheGetAll).toHaveBeenCalledOnce();
      expect(result).toEqual(cards);
    });

    it("should filter by lessonId when provided", () => {
      const filtered = [makeCard({ lessonId: "lesson-1" })];
      mockCacheGetByIndex.mockReturnValue(filtered);

      const result = flashcardService.getAll("lesson-1");

      expect(mockCacheGetByIndex).toHaveBeenCalledWith("lessonId", "lesson-1");
      expect(result).toEqual(filtered);
    });
  });

  // ── getStats ────────────────────────────────────────────────────
  describe("getStats", () => {
    it("should count cards by state in a single pass", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      const cards: Flashcard[] = [
        makeCard({ state: "new", nextReviewDate: pastDate }),
        makeCard({ id: "fc-2", state: "new", nextReviewDate: futureDate }),
        makeCard({ id: "fc-3", state: "learning", nextReviewDate: pastDate }),
        makeCard({ id: "fc-4", state: "review", nextReviewDate: pastDate }),
        makeCard({ id: "fc-5", state: "review", nextReviewDate: futureDate }),
        makeCard({ id: "fc-6", state: "graduated", nextReviewDate: pastDate }),
      ];
      mockCacheGetAll.mockReturnValue(cards);

      const stats = flashcardService.getStats();

      expect(stats.total).toBe(6);
      expect(stats.new).toBe(2);
      expect(stats.learning).toBe(1);
      expect(stats.review).toBe(2);
      expect(stats.graduated).toBe(1);
      // due: new(past) + learning(past) + review(past) = 3 (graduated excluded)
      expect(stats.dueToday).toBe(3);
    });

    it("should return all zeros when no cards exist", () => {
      mockCacheGetAll.mockReturnValue([]);

      const stats = flashcardService.getStats();

      expect(stats).toEqual({
        total: 0,
        new: 0,
        learning: 0,
        review: 0,
        graduated: 0,
        dueToday: 0,
      });
    });
  });

  // ── delete ──────────────────────────────────────────────────────
  describe("delete", () => {
    it("should delete card and invalidate caches when found", () => {
      mockCacheDelete.mockReturnValue(true);

      const result = flashcardService.delete("fc-1");

      expect(result).toBe(true);
      expect(mockCacheDelete).toHaveBeenCalledWith("fc-1");
      expect(invalidateFlashcardCaches).toHaveBeenCalledOnce();
    });

    it("should return false and not invalidate when card not found", () => {
      mockCacheDelete.mockReturnValue(false);

      const result = flashcardService.delete("nonexistent");

      expect(result).toBe(false);
      expect(invalidateFlashcardCaches).not.toHaveBeenCalled();
    });
  });
});
