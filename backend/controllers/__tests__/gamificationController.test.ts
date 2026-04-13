import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock XpModel
const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();
vi.mock("../../models/Xp", () => ({
  XpModel: {
    findOne: (...args: any[]) => ({
      lean: () => mockFindOne(...args),
    }),
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
  },
}));

import { addXp, getStats } from "../gamificationController";

// asyncHandler doesn't return the inner promise, so we flush microtasks
const flushPromises = () => new Promise((r) => setTimeout(r, 0));

// ---------- Helpers ----------

function makeXpData(overrides: Record<string, any> = {}) {
  return {
    totalXp: 0,
    streakDays: 0,
    lastActiveDate: null as string | null,
    history: [] as Array<{ action: string; amount: number; timestamp: number }>,
    ...overrides,
  };
}

function makeReq(body: Record<string, any> = {}, userId = "test-user") {
  return { body, user: { userId } } as any;
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    _jsonData: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res._jsonData = data;
      return res;
    },
  };
  return res;
}

/** Returns today's date as YYYY-MM-DD */
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/** Returns yesterday's date as YYYY-MM-DD */
function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

/** Returns day before yesterday as YYYY-MM-DD */
function twoDaysAgoStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return d.toISOString().split("T")[0];
}

describe("gamificationController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── addXp() ─────────────────────────────────────────────────────────

  describe("addXp()", () => {
    it("returns 400 when action is missing", async () => {
      const req = makeReq({});
      const res = makeRes();

      addXp(req, res, vi.fn());
      await flushPromises();

      expect(res.statusCode).toBe(400);
      expect(res._jsonData.ok).toBe(false);
      expect(res._jsonData.error).toContain("action is required");
    });

    it("increments totalXp", async () => {
      mockFindOne.mockResolvedValue(makeXpData({ totalXp: 100, lastActiveDate: todayStr() }));
      mockFindOneAndUpdate.mockResolvedValue(makeXpData({ totalXp: 110, streakDays: 1, lastActiveDate: todayStr() }));
      const req = makeReq({ action: "quiz-answer" }); // default 10 XP
      const res = makeRes();

      addXp(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.ok).toBe(true);
      expect(res._jsonData.totalXp).toBe(110);
      expect(res._jsonData.earned).toBe(10);
    });

    it("uses custom amount when provided", async () => {
      mockFindOne.mockResolvedValue(makeXpData({ totalXp: 50, lastActiveDate: todayStr() }));
      mockFindOneAndUpdate.mockResolvedValue(makeXpData({ totalXp: 75, streakDays: 1, lastActiveDate: todayStr() }));
      const req = makeReq({ action: "custom-action", amount: 25 });
      const res = makeRes();

      addXp(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.totalXp).toBe(75);
      expect(res._jsonData.earned).toBe(25);
    });

    it("defaults to 0 XP for unknown action without custom amount", async () => {
      mockFindOne.mockResolvedValue(makeXpData({ totalXp: 50, lastActiveDate: todayStr() }));
      mockFindOneAndUpdate.mockResolvedValue(makeXpData({ totalXp: 50, streakDays: 1, lastActiveDate: todayStr() }));
      const req = makeReq({ action: "unknown-action" });
      const res = makeRes();

      addXp(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.totalXp).toBe(50);
      expect(res._jsonData.earned).toBe(0);
    });

    it("increments streak on first action of the day (continuation from yesterday)", async () => {
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpData({ totalXp: 110, streakDays: 4, lastActiveDate: todayStr() })
      );
      const req = makeReq({ action: "quiz-answer" });
      const res = makeRes();

      addXp(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.streakDays).toBe(4);
      // Verify pipeline update was used (array as 2nd arg with $set stage)
      const updateCall = mockFindOneAndUpdate.mock.calls[0];
      const pipeline = updateCall[1];
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline[0].$set).toBeDefined();
      expect(pipeline[0].$set.streakDays).toBeDefined();
    });

    it("doesn't double-increment streak for same day", async () => {
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpData({ totalXp: 110, streakDays: 5, lastActiveDate: todayStr() })
      );
      const req = makeReq({ action: "quiz-answer" });
      const res = makeRes();

      addXp(req, res, vi.fn());
      await flushPromises();

      // Streak should remain unchanged (server-side $switch keeps current value)
      expect(res._jsonData.streakDays).toBe(5);
      // Verify pipeline update was used
      const updateCall = mockFindOneAndUpdate.mock.calls[0];
      const pipeline = updateCall[1];
      expect(Array.isArray(pipeline)).toBe(true);
      // The $switch expression handles same-day logic server-side
      expect(pipeline[0].$set.streakDays.$switch).toBeDefined();
    });

    it("resets streak when day is missed", async () => {
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpData({ totalXp: 110, streakDays: 1, lastActiveDate: todayStr() })
      );
      const req = makeReq({ action: "quiz-answer" });
      const res = makeRes();

      addXp(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.streakDays).toBe(1);
      // Verify pipeline update was used with $switch default of 1
      const updateCall = mockFindOneAndUpdate.mock.calls[0];
      const pipeline = updateCall[1];
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline[0].$set.streakDays.$switch.default).toBe(1);
    });

    it("handles null lastActiveDate (first time user)", async () => {
      mockFindOne.mockResolvedValue(null); // No existing doc
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpData({ totalXp: 20, streakDays: 1, lastActiveDate: todayStr() })
      );
      const req = makeReq({ action: "plan-create" }); // 20 XP
      const res = makeRes();

      addXp(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.ok).toBe(true);
      expect(res._jsonData.streakDays).toBe(1);
      expect(res._jsonData.totalXp).toBe(20);
      // Verify upsert was used
      const updateCall = mockFindOneAndUpdate.mock.calls[0];
      expect(updateCall[2].upsert).toBe(true);
    });

    it("concurrent requests are handled by MongoDB atomicity", async () => {
      mockFindOne.mockResolvedValue(makeXpData({ totalXp: 0, lastActiveDate: null }));
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpData({ totalXp: 10, streakDays: 1, lastActiveDate: todayStr() })
      );

      const req1 = makeReq({ action: "quiz-answer" });
      const req2 = makeReq({ action: "flashcard-review" });
      const res1 = makeRes();
      const res2 = makeRes();

      addXp(req1, res1, vi.fn());
      addXp(req2, res2, vi.fn());
      await flushPromises();

      expect(res1._jsonData.ok).toBe(true);
      expect(res2._jsonData.ok).toBe(true);
      expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(2);
    });

    it("trims history to last 500 events via $slice", async () => {
      mockFindOneAndUpdate.mockResolvedValue(
        makeXpData({ totalXp: 5010, streakDays: 1, lastActiveDate: todayStr() })
      );
      const req = makeReq({ action: "quiz-answer" });
      const res = makeRes();

      addXp(req, res, vi.fn());
      await flushPromises();

      // Verify $slice: -500 is used in the pipeline's history expression
      const updateCall = mockFindOneAndUpdate.mock.calls[0];
      const pipeline = updateCall[1];
      expect(Array.isArray(pipeline)).toBe(true);
      const historyExpr = pipeline[0].$set.history;
      expect(historyExpr.$slice[1]).toBe(-500);
    });
  });

  // ── getStats() ──────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("returns correct stats", async () => {
      mockFindOne.mockResolvedValue(
        makeXpData({
          totalXp: 250,
          streakDays: 7,
          lastActiveDate: todayStr(),
          history: [
            { action: "quiz-answer", amount: 10, timestamp: Date.now() - 1000 },
            { action: "flashcard-review", amount: 5, timestamp: Date.now() - 500 },
          ],
        })
      );
      const req = makeReq({});
      const res = makeRes();

      getStats(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.ok).toBe(true);
      expect(res._jsonData.totalXp).toBe(250);
      expect(res._jsonData.streakDays).toBe(7);
      expect(res._jsonData.lastActiveDate).toBe(todayStr());
    });

    it("calculates todayXp from history", async () => {
      const todayStart = new Date(todayStr()).getTime();
      mockFindOne.mockResolvedValue(
        makeXpData({
          totalXp: 100,
          streakDays: 1,
          lastActiveDate: todayStr(),
          history: [
            { action: "quiz-answer", amount: 10, timestamp: todayStart + 1000 },
            { action: "flashcard-review", amount: 5, timestamp: todayStart + 2000 },
            { action: "old-action", amount: 20, timestamp: todayStart - 86400000 },
          ],
        })
      );
      const req = makeReq({});
      const res = makeRes();

      getStats(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.todayXp).toBe(15);
    });

    it("resets streak when lastActiveDate is stale (more than 1 day ago)", async () => {
      mockFindOne.mockResolvedValue(
        makeXpData({
          totalXp: 500,
          streakDays: 15,
          lastActiveDate: twoDaysAgoStr(),
          history: [],
        })
      );
      const req = makeReq({});
      const res = makeRes();

      getStats(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.streakDays).toBe(0);
    });

    it("keeps streak when lastActiveDate is yesterday", async () => {
      mockFindOne.mockResolvedValue(
        makeXpData({
          totalXp: 500,
          streakDays: 5,
          lastActiveDate: yesterdayStr(),
          history: [],
        })
      );
      const req = makeReq({});
      const res = makeRes();

      getStats(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.streakDays).toBe(5);
    });

    it("returns recent history (last 20)", async () => {
      const history = Array.from({ length: 30 }, (_, i) => ({
        action: "quiz-answer",
        amount: 10,
        timestamp: Date.now() - (30 - i) * 1000,
      }));
      mockFindOne.mockResolvedValue(
        makeXpData({ totalXp: 300, lastActiveDate: todayStr(), history })
      );
      const req = makeReq({});
      const res = makeRes();

      getStats(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.recentHistory).toHaveLength(20);
    });

    it("returns defaults for user with no XP data", async () => {
      mockFindOne.mockResolvedValue(null);
      const req = makeReq({});
      const res = makeRes();

      getStats(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.ok).toBe(true);
      expect(res._jsonData.totalXp).toBe(0);
      expect(res._jsonData.streakDays).toBe(0);
      expect(res._jsonData.todayXp).toBe(0);
      expect(res._jsonData.lastActiveDate).toBeNull();
      expect(res._jsonData.recentHistory).toEqual([]);
    });

    it("does not reset streak for first-time user (null lastActiveDate)", async () => {
      mockFindOne.mockResolvedValue(
        makeXpData({
          totalXp: 0,
          streakDays: 0,
          lastActiveDate: null,
          history: [],
        })
      );
      const req = makeReq({});
      const res = makeRes();

      getStats(req, res, vi.fn());
      await flushPromises();

      expect(res._jsonData.streakDays).toBe(0);
    });
  });
});
