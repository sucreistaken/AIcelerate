import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the cache module
const _flashcardStore: any[] = [];
const _flashcardIndexes: Record<string, Map<string, any[]>> = {
  lessonId: new Map(),
};

function rebuildIndex() {
  _flashcardIndexes.lessonId.clear();
  for (const card of _flashcardStore) {
    const key = card.lessonId;
    if (!_flashcardIndexes.lessonId.has(key)) {
      _flashcardIndexes.lessonId.set(key, []);
    }
    _flashcardIndexes.lessonId.get(key)!.push(card);
  }
}

vi.mock("../../cache", () => ({
  flashcardCache: {
    getAll: () => [..._flashcardStore],
    get: (id: string) => _flashcardStore.find((c: any) => c.id === id) ?? null,
    set: (item: any) => {
      const idx = _flashcardStore.findIndex((c: any) => c.id === item.id);
      if (idx >= 0) _flashcardStore[idx] = item;
      else _flashcardStore.push(item);
      rebuildIndex();
    },
    setAll: (items: any[]) => {
      _flashcardStore.length = 0;
      _flashcardStore.push(...items);
      rebuildIndex();
    },
    delete: (id: string) => {
      const idx = _flashcardStore.findIndex((c: any) => c.id === id);
      if (idx < 0) return false;
      _flashcardStore.splice(idx, 1);
      rebuildIndex();
      return true;
    },
    filter: (pred: any) => _flashcardStore.filter(pred),
    getByIndex: (indexName: string, key: string) => {
      if (indexName === "lessonId") {
        return _flashcardIndexes.lessonId.get(key) || [];
      }
      return [];
    },
    flush: vi.fn(),
  },
  invalidateFlashcardCaches: vi.fn(),
}));

// Mock lessonDataService (flashcardService imports getLesson from here)
const mockGetLesson = vi.fn();
vi.mock("../../services/lessonDataService", () => ({
  getLesson: (...args: any[]) => mockGetLesson(...args),
}));

// Mock idGenerator to produce predictable IDs
let idCounter = 0;
vi.mock("../../utils/idGenerator", () => ({
  generateId: (prefix?: string) => {
    idCounter++;
    return prefix ? `${prefix}-${idCounter}` : `id-${idCounter}`;
  },
}));

import {
  createCard,
  generateFlashcardsForLesson,
  reviewCard,
  getDueCards,
  getFlashcardStats,
} from "../flashcardController";

describe("flashcardController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _flashcardStore.length = 0;
    rebuildIndex();
    idCounter = 0;
  });

  // ── createCard() ────────────────────────────────────────────────────

  describe("createCard()", () => {
    it("returns card with correct fields and SM-2 defaults", () => {
      const card = createCard("lesson-1", "Calculus", "What is a limit?", "A limit is...", "emphasis");

      expect(card.lessonId).toBe("lesson-1");
      expect(card.topicName).toBe("Calculus");
      expect(card.front).toBe("What is a limit?");
      expect(card.back).toBe("A limit is...");
      expect(card.source).toBe("emphasis");
      // SM-2 defaults
      expect(card.interval).toBe(0);
      expect(card.easeFactor).toBe(2.5);
      expect(card.repetitions).toBe(0);
      expect(card.state).toBe("new");
      expect(card.id).toMatch(/^fc-/);
      expect(card.nextReviewDate).toBeDefined();
      expect(card.createdAt).toBeDefined();
    });
  });

  // ── generateFlashcardsForLesson() ───────────────────────────────────

  describe("generateFlashcardsForLesson()", () => {
    it("returns empty for missing lesson", () => {
      mockGetLesson.mockReturnValue(null);

      const result = generateFlashcardsForLesson("nonexistent");

      expect(result).toEqual([]);
    });

    it("creates cards from emphases", () => {
      mockGetLesson.mockReturnValue({
        id: "lesson-1",
        plan: {
          emphases: [
            { statement: "Limits are fundamental", why: "They underpin calculus", evidence: "Professor said so" },
            { statement: "Continuity matters", why: "Required for derivatives" },
          ],
        },
      });

      const result = generateFlashcardsForLesson("lesson-1");

      expect(result).toHaveLength(2);
      expect(result[0].front).toBe("Limits are fundamental");
      expect(result[0].source).toBe("emphasis");
      expect(result[0].back).toContain("They underpin calculus");
      expect(result[1].front).toBe("Continuity matters");
    });

    it("avoids duplicate fronts", () => {
      // Pre-populate the store with an existing card
      const existingCard = createCard("lesson-1", "Topic", "Limits are fundamental", "Back", "emphasis");
      _flashcardStore.push(existingCard);
      rebuildIndex();

      mockGetLesson.mockReturnValue({
        id: "lesson-1",
        plan: {
          emphases: [
            { statement: "Limits are fundamental", why: "Duplicate" },
            { statement: "New concept", why: "Fresh" },
          ],
        },
      });

      const result = generateFlashcardsForLesson("lesson-1");

      // Only the non-duplicate should be created
      expect(result).toHaveLength(1);
      expect(result[0].front).toBe("New concept");
    });

    it("creates cards from cheatSheet quickQuiz", () => {
      mockGetLesson.mockReturnValue({
        id: "lesson-1",
        plan: { emphases: [] },
        cheatSheet: {
          quickQuiz: [
            { q: "What is 2+2?", a: "4" },
            { q: "What is 3*3?", a: "9" },
          ],
        },
      });

      const result = generateFlashcardsForLesson("lesson-1");

      expect(result).toHaveLength(2);
      expect(result[0].front).toBe("What is 2+2?");
      expect(result[0].source).toBe("cheatsheet");
    });
  });

  // ── reviewCard() ────────────────────────────────────────────────────

  describe("reviewCard()", () => {
    it("returns null for missing card", () => {
      const result = reviewCard("nonexistent", 4);
      expect(result).toBeNull();
    });

    it("with quality >= 3: increments repetitions, calculates interval", () => {
      const card = createCard("l1", "Topic", "Q?", "A", "emphasis");
      _flashcardStore.push(card);
      rebuildIndex();

      // First successful review: repetitions 0 -> 1, interval -> 1
      const result1 = reviewCard(card.id, 4)!;
      expect(result1.card.repetitions).toBe(1);
      expect(result1.card.interval).toBe(1);
      expect(result1.card.state).toBe("review");

      // Second successful review: repetitions 1 -> 2, interval -> 6
      const result2 = reviewCard(card.id, 4)!;
      expect(result2.card.repetitions).toBe(2);
      expect(result2.card.interval).toBe(6);

      // Third successful review: repetitions 2 -> 3, interval = round(6 * 2.5) = 15
      const result3 = reviewCard(card.id, 5)!;
      expect(result3.card.repetitions).toBe(3);
      expect(result3.card.interval).toBe(15); // 6 * 2.5 = 15
    });

    it("with quality < 3: resets repetitions to 0", () => {
      const card = createCard("l1", "Topic", "Q?", "A", "emphasis");
      card.repetitions = 5;
      card.interval = 30;
      _flashcardStore.push(card);
      rebuildIndex();

      const result = reviewCard(card.id, 2)!;

      expect(result.card.repetitions).toBe(0);
      expect(result.card.interval).toBe(1);
      expect(result.card.state).toBe("learning");
    });

    it("ease factor only changes when quality < 3 (SM-2 fix)", () => {
      const card = createCard("l1", "Topic", "Q?", "A", "emphasis");
      _flashcardStore.push(card);
      rebuildIndex();

      const originalEaseFactor = card.easeFactor; // 2.5

      // Quality >= 3: ease factor should NOT change
      const result1 = reviewCard(card.id, 5)!;
      expect(result1.card.easeFactor).toBe(originalEaseFactor);

      // Quality >= 3 again: still should NOT change
      const result2 = reviewCard(card.id, 3)!;
      expect(result2.card.easeFactor).toBe(originalEaseFactor);

      // Quality < 3: ease factor SHOULD change (decrease)
      const result3 = reviewCard(card.id, 1)!;
      expect(result3.card.easeFactor).not.toBe(originalEaseFactor);
      expect(result3.card.easeFactor).toBeLessThan(originalEaseFactor);
    });

    it("ease factor doesn't go below 1.3", () => {
      const card = createCard("l1", "Topic", "Q?", "A", "emphasis");
      card.easeFactor = 1.35; // Just above minimum
      _flashcardStore.push(card);
      rebuildIndex();

      // quality 0: biggest penalty
      const result = reviewCard(card.id, 0)!;
      expect(result.card.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it("graduates card at repetitions >= 8", () => {
      const card = createCard("l1", "Topic", "Q?", "A", "emphasis");
      card.repetitions = 7;
      card.interval = 100;
      _flashcardStore.push(card);
      rebuildIndex();

      const result = reviewCard(card.id, 4)!;

      expect(result.card.repetitions).toBe(8);
      expect(result.card.state).toBe("graduated");
    });

    it("returns a reviewEntry with correct fields", () => {
      const card = createCard("l1", "Topic", "Q?", "A", "emphasis");
      card.interval = 5;
      _flashcardStore.push(card);
      rebuildIndex();

      const result = reviewCard(card.id, 4)!;

      expect(result.reviewEntry.cardId).toBe(card.id);
      expect(result.reviewEntry.quality).toBe(4);
      expect(result.reviewEntry.previousInterval).toBe(5);
      expect(result.reviewEntry.newInterval).toBe(result.card.interval);
      expect(result.reviewEntry.reviewedAt).toBeDefined();
    });
  });

  // ── getDueCards() ───────────────────────────────────────────────────

  describe("getDueCards()", () => {
    it("returns only non-graduated cards with past nextReviewDate", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow

      _flashcardStore.push(
        { ...createCard("l1", "T", "Due card", "A", "emphasis"), id: "due-1", nextReviewDate: pastDate, state: "review" },
        { ...createCard("l1", "T", "Future card", "A", "emphasis"), id: "future-1", nextReviewDate: futureDate, state: "review" },
        { ...createCard("l1", "T", "Graduated card", "A", "emphasis"), id: "grad-1", nextReviewDate: pastDate, state: "graduated" },
        { ...createCard("l1", "T", "New due card", "A", "emphasis"), id: "new-1", nextReviewDate: pastDate, state: "new" },
      );
      rebuildIndex();

      const result = getDueCards();

      const ids = result.map((c) => c.id);
      expect(ids).toContain("due-1");
      expect(ids).toContain("new-1");
      expect(ids).not.toContain("future-1");
      expect(ids).not.toContain("grad-1");
    });

    it("returns empty array when no cards are due", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      _flashcardStore.push(
        { ...createCard("l1", "T", "Q", "A", "emphasis"), id: "f1", nextReviewDate: futureDate, state: "review" },
      );
      rebuildIndex();

      const result = getDueCards();

      expect(result).toEqual([]);
    });
  });

  // ── getFlashcardStats() ─────────────────────────────────────────────

  describe("getFlashcardStats()", () => {
    it("returns correct counts by state", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      _flashcardStore.push(
        { ...createCard("l1", "T", "Q1", "A", "emphasis"), id: "s1", state: "new", nextReviewDate: pastDate },
        { ...createCard("l1", "T", "Q2", "A", "emphasis"), id: "s2", state: "new", nextReviewDate: futureDate },
        { ...createCard("l1", "T", "Q3", "A", "emphasis"), id: "s3", state: "learning", nextReviewDate: pastDate },
        { ...createCard("l1", "T", "Q4", "A", "emphasis"), id: "s4", state: "review", nextReviewDate: futureDate },
        { ...createCard("l1", "T", "Q5", "A", "emphasis"), id: "s5", state: "graduated", nextReviewDate: pastDate },
      );
      rebuildIndex();

      const stats = getFlashcardStats();

      expect(stats.total).toBe(5);
      expect(stats.new).toBe(2);
      expect(stats.learning).toBe(1);
      expect(stats.review).toBe(1);
      expect(stats.graduated).toBe(1);
      // dueToday: non-graduated with past nextReviewDate = s1 (new, past) + s3 (learning, past)
      expect(stats.dueToday).toBe(2);
    });

    it("returns zeros when no cards exist", () => {
      const stats = getFlashcardStats();

      expect(stats.total).toBe(0);
      expect(stats.new).toBe(0);
      expect(stats.learning).toBe(0);
      expect(stats.review).toBe(0);
      expect(stats.graduated).toBe(0);
      expect(stats.dueToday).toBe(0);
    });
  });
});
