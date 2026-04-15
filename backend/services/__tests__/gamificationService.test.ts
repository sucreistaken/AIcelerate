import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock XpModel ────────────────────────────────────────────────────────────
const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();

vi.mock("../../models/Xp", () => ({
  XpModel: {
    findOne: (...args: any[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
  },
}));

import { gamificationService } from "../gamificationService";

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function makeXpDoc(overrides: Record<string, any> = {}) {
  return {
    userId: overrides.userId || "user-1",
    totalXp: overrides.totalXp ?? 100,
    streakDays: overrides.streakDays ?? 3,
    lastActiveDate: "lastActiveDate" in overrides ? overrides.lastActiveDate : todayStr(),
    history: overrides.history ?? [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };
}

// Chainable .lean() support
function leanable(doc: any) {
  return { lean: vi.fn().mockResolvedValue(doc) };
}

describe("gamificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── addXp ─────────────────────────────────────────────────────────────

  describe("addXp()", () => {
    it("creates new user document with streak 1", async () => {
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpDoc({ totalXp: 10, streakDays: 1 })
      );

      const result = await gamificationService.addXp("user-1", "quiz-answer");

      // Atomic pipeline update: first arg is filter, second is pipeline array
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-1" },
        expect.arrayContaining([expect.objectContaining({ $set: expect.any(Object) })]),
        { upsert: true, returnDocument: 'after' }
      );
      expect(result.totalXp).toBe(10);
      expect(result.earned).toBe(10);
      expect(result.streakDays).toBe(1);
    });

    it("same day activity does not change streak", async () => {
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpDoc({ totalXp: 110, streakDays: 5 })
      );

      const result = await gamificationService.addXp("user-1", "quiz-answer");

      // Pipeline handles streak atomically — verify result
      expect(result.streakDays).toBe(5);
    });

    it("consecutive day increments streak", async () => {
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpDoc({ totalXp: 115, streakDays: 5 })
      );

      const result = await gamificationService.addXp("user-1", "flashcard-review");

      expect(result.earned).toBe(5); // flashcard-review = 5 XP
      expect(result.streakDays).toBe(5);
    });

    it("gap in activity resets streak to 1", async () => {
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpDoc({ totalXp: 103, streakDays: 1 })
      );

      const result = await gamificationService.addXp("user-1", "deep-dive-ask");

      expect(result.streakDays).toBe(1); // reset
      expect(result.earned).toBe(3); // deep-dive-ask = 3 XP
    });

    it("uses custom amount when provided", async () => {
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpDoc({ totalXp: 50, streakDays: 1 })
      );

      const result = await gamificationService.addXp("user-1", "quiz-answer", 50);

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-1" },
        expect.arrayContaining([expect.objectContaining({ $set: expect.any(Object) })]),
        { upsert: true, returnDocument: 'after' }
      );
      expect(result.earned).toBe(50);
    });

    it("unknown action awards 0 XP", async () => {
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpDoc({ totalXp: 0, streakDays: 1 })
      );

      const result = await gamificationService.addXp("user-1", "totally-unknown-action");

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-1" },
        expect.arrayContaining([expect.objectContaining({ $set: expect.any(Object) })]),
        { upsert: true, returnDocument: 'after' }
      );
      expect(result.earned).toBe(0);
    });

    it("records action in history via atomic pipeline", async () => {
      mockFindOneAndUpdate.mockResolvedValue(makeXpDoc());

      await gamificationService.addXp("user-1", "plan-create");

      // Pipeline update uses $set with $concatArrays for history
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-1" },
        expect.arrayContaining([expect.objectContaining({ $set: expect.any(Object) })]),
        { upsert: true, returnDocument: 'after' }
      );
    });

    it("awards correct XP for each known action", async () => {
      const expectedAmounts: Record<string, number> = {
        "quiz-answer": 10,
        "flashcard-review": 5,
        "deep-dive-ask": 3,
        "plan-create": 20,
        "cheat-sheet-create": 15,
        "mindmap-learn": 2,
        "note-create": 2,
      };

      for (const [action, xp] of Object.entries(expectedAmounts)) {
        vi.clearAllMocks();
        mockFindOne.mockReturnValue(leanable(null));
        mockFindOneAndUpdate.mockResolvedValue(makeXpDoc({ totalXp: xp, streakDays: 1 }));

        const result = await gamificationService.addXp("user-1", action);
        expect(result.earned).toBe(xp);
      }
    });
  });

  // ── getStats ──────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("returns zeros when no document exists", async () => {
      mockFindOne.mockReturnValue(leanable(null));

      const stats = await gamificationService.getStats("user-1");

      expect(stats).toEqual({
        totalXp: 0,
        streakDays: 0,
        todayXp: 0,
        lastActiveDate: null,
        recentHistory: [],
      });
    });

    it("returns valid stats with active streak (today)", async () => {
      const now = Date.now();
      mockFindOne.mockReturnValue(
        leanable(
          makeXpDoc({
            totalXp: 200,
            streakDays: 7,
            lastActiveDate: todayStr(),
            history: [
              { action: "quiz-answer", amount: 10, timestamp: now - 1000 },
              { action: "flashcard-review", amount: 5, timestamp: now - 2000 },
            ],
          })
        )
      );

      const stats = await gamificationService.getStats("user-1");

      expect(stats.totalXp).toBe(200);
      expect(stats.streakDays).toBe(7);
      expect(stats.todayXp).toBe(15); // 10 + 5
      expect(stats.lastActiveDate).toBe(todayStr());
      expect(stats.recentHistory).toHaveLength(2);
    });

    it("returns valid stats with active streak (yesterday)", async () => {
      mockFindOne.mockReturnValue(
        leanable(
          makeXpDoc({
            totalXp: 50,
            streakDays: 3,
            lastActiveDate: yesterdayStr(),
            history: [],
          })
        )
      );

      const stats = await gamificationService.getStats("user-1");

      // Streak is still valid if lastActiveDate is yesterday
      expect(stats.streakDays).toBe(3);
      expect(stats.todayXp).toBe(0);
    });

    it("resets streak to 0 when last active date is stale (not today or yesterday)", async () => {
      mockFindOne.mockReturnValue(
        leanable(
          makeXpDoc({
            totalXp: 300,
            streakDays: 15,
            lastActiveDate: daysAgoStr(5),
            history: [],
          })
        )
      );

      const stats = await gamificationService.getStats("user-1");

      expect(stats.streakDays).toBe(0);
      expect(stats.totalXp).toBe(300);
    });

    it("returns todayXp as sum of today's history entries only", async () => {
      const todayStart = new Date(todayStr()).getTime();
      mockFindOne.mockReturnValue(
        leanable(
          makeXpDoc({
            totalXp: 100,
            streakDays: 2,
            lastActiveDate: todayStr(),
            history: [
              // Yesterday entry - should not count
              { action: "quiz-answer", amount: 10, timestamp: todayStart - 86400000 },
              // Today entries
              { action: "quiz-answer", amount: 10, timestamp: todayStart + 1000 },
              { action: "flashcard-review", amount: 5, timestamp: todayStart + 2000 },
            ],
          })
        )
      );

      const stats = await gamificationService.getStats("user-1");

      expect(stats.todayXp).toBe(15); // Only today's entries
    });

    it("returns last 20 history entries in recentHistory", async () => {
      const history = Array.from({ length: 30 }, (_, i) => ({
        action: "quiz-answer",
        amount: 10,
        timestamp: Date.now() - i * 1000,
      }));

      mockFindOne.mockReturnValue(
        leanable(makeXpDoc({ history }))
      );

      const stats = await gamificationService.getStats("user-1");

      expect(stats.recentHistory).toHaveLength(20);
    });

    it("handles null lastActiveDate (no activity yet)", async () => {
      mockFindOne.mockReturnValue(
        leanable(
          makeXpDoc({
            totalXp: 0,
            streakDays: 0,
            lastActiveDate: null,
            history: [],
          })
        )
      );

      const stats = await gamificationService.getStats("user-1");

      // Null lastActiveDate => streak stays as-is (0)
      expect(stats.streakDays).toBe(0);
      expect(stats.lastActiveDate).toBeNull();
    });
  });
});
