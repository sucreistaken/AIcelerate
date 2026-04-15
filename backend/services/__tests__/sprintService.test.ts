import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock idGenerator ────────────────────────────────────────────────────────
let idCounter = 0;
vi.mock("../../utils/idGenerator", () => ({
  generateId: (prefix?: string) => `${prefix}-mock-${++idCounter}`,
}));

// ── Mock SprintModel ────────────────────────────────────────────────────────
const mockFindOneAndUpdate = vi.fn();

vi.mock("../../models/Sprint", () => ({
  SprintModel: {
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
  },
}));

import { sprintService } from "../sprintService";

// ── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  studyDurationMin: 40,
  breakDurationMin: 10,
  intensiveMode: false,
};

function makeSprintDoc(overrides: Record<string, any> = {}) {
  return {
    userId: "global",
    settings: overrides.settings ?? { ...DEFAULT_SETTINGS },
    sessions: overrides.sessions ?? [],
    ...overrides,
  };
}

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? "sprint-mock-1",
    startedAt: overrides.startedAt ?? "2025-06-01T10:00:00.000Z",
    lessonId: overrides.lessonId ?? undefined,
    status: overrides.status ?? "studying",
    pomodorosCompleted: overrides.pomodorosCompleted ?? 0,
    topicsCovered: overrides.topicsCovered ?? [],
    totalStudyMinutes: overrides.totalStudyMinutes ?? 0,
    ...overrides,
  };
}

describe("sprintService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    idCounter = 0;
  });

  // ── getSettings ───────────────────────────────────────────────────────

  describe("getSettings()", () => {
    it("returns settings from existing document", async () => {
      const doc = makeSprintDoc({
        settings: { studyDurationMin: 25, breakDurationMin: 5, intensiveMode: true },
      });
      // ensureDoc calls findOneAndUpdate
      mockFindOneAndUpdate.mockResolvedValue(doc);

      const result = await sprintService.getSettings();

      expect(result.studyDurationMin).toBe(25);
      expect(result.breakDurationMin).toBe(5);
      expect(result.intensiveMode).toBe(true);
    });

    it("returns defaults when no document exists (upsert creates)", async () => {
      const doc = makeSprintDoc(); // default settings
      mockFindOneAndUpdate.mockResolvedValue(doc);

      const result = await sprintService.getSettings();

      expect(result).toEqual(DEFAULT_SETTINGS);
      // ensureDoc should use $setOnInsert
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: "global" },
        { $setOnInsert: { settings: DEFAULT_SETTINGS, sessions: [] } },
        { upsert: true, returnDocument: 'after' }
      );
    });
  });

  // ── updateSettings ────────────────────────────────────────────────────

  describe("updateSettings()", () => {
    it("updates partial settings", async () => {
      const updated = makeSprintDoc({
        settings: { studyDurationMin: 30, breakDurationMin: 10, intensiveMode: false },
      });
      mockFindOneAndUpdate.mockResolvedValue(updated);

      const result = await sprintService.updateSettings({ studyDurationMin: 30 });

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: "global" },
        { $set: { "settings.studyDurationMin": 30 } },
        { returnDocument: 'after', upsert: true }
      );
      expect(result.studyDurationMin).toBe(30);
    });

    it("updates multiple fields at once", async () => {
      const updated = makeSprintDoc({
        settings: { studyDurationMin: 50, breakDurationMin: 15, intensiveMode: true },
      });
      mockFindOneAndUpdate.mockResolvedValue(updated);

      const result = await sprintService.updateSettings({
        studyDurationMin: 50,
        breakDurationMin: 15,
        intensiveMode: true,
      });

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: "global" },
        {
          $set: {
            "settings.studyDurationMin": 50,
            "settings.breakDurationMin": 15,
            "settings.intensiveMode": true,
          },
        },
        { returnDocument: 'after', upsert: true }
      );
      expect(result.studyDurationMin).toBe(50);
      expect(result.breakDurationMin).toBe(15);
      expect(result.intensiveMode).toBe(true);
    });

    it("ignores undefined values", async () => {
      const updated = makeSprintDoc();
      mockFindOneAndUpdate.mockResolvedValue(updated);

      await sprintService.updateSettings({ studyDurationMin: undefined, breakDurationMin: 5 });

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: "global" },
        { $set: { "settings.breakDurationMin": 5 } },
        { returnDocument: 'after', upsert: true }
      );
    });
  });

  // ── createSession ─────────────────────────────────────────────────────

  describe("createSession()", () => {
    it("creates session with generated ID and status=studying", async () => {
      mockFindOneAndUpdate.mockResolvedValue(makeSprintDoc());

      const result = await sprintService.createSession("lesson-1");

      expect(result.id).toMatch(/^sprint-/);
      expect(result.status).toBe("studying");
      expect(result.lessonId).toBe("lesson-1");
      expect(result.pomodorosCompleted).toBe(0);
      expect(result.topicsCovered).toEqual([]);
      expect(result.totalStudyMinutes).toBe(0);
      expect(result.startedAt).toBeDefined();
    });

    it("pushes session to front with max 50 cap", async () => {
      mockFindOneAndUpdate.mockResolvedValue(makeSprintDoc());

      await sprintService.createSession();

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: "global" },
        {
          $push: {
            sessions: {
              $each: [expect.objectContaining({ status: "studying" })],
              $position: 0,
              $slice: 50,
            },
          },
          $setOnInsert: { settings: DEFAULT_SETTINGS },
        },
        { upsert: true }
      );
    });

    it("creates session without lessonId", async () => {
      mockFindOneAndUpdate.mockResolvedValue(makeSprintDoc());

      const result = await sprintService.createSession();

      expect(result.lessonId).toBeUndefined();
    });
  });

  // ── updateSession ─────────────────────────────────────────────────────

  describe("updateSession()", () => {
    it("updates session progress fields", async () => {
      const session = makeSession({ id: "sess-1", status: "completed", pomodorosCompleted: 3 });
      const doc = makeSprintDoc({ sessions: [session] });
      mockFindOneAndUpdate.mockResolvedValue(doc);

      const result = await sprintService.updateSession("sess-1", {
        status: "completed",
        pomodorosCompleted: 3,
      });

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: "global", "sessions.id": "sess-1" },
        {
          $set: {
            "sessions.$.status": "completed",
            "sessions.$.pomodorosCompleted": 3,
          },
        },
        { returnDocument: 'after' }
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe("completed");
    });

    it("returns null when session not found", async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);

      const result = await sprintService.updateSession("nonexistent", { status: "abandoned" });

      expect(result).toBeNull();
    });

    it("ignores id field in updates", async () => {
      const session = makeSession({ id: "sess-1" });
      const doc = makeSprintDoc({ sessions: [session] });
      mockFindOneAndUpdate.mockResolvedValue(doc);

      await sprintService.updateSession("sess-1", {
        id: "should-be-ignored",
        status: "break",
      } as any);

      const setFields = mockFindOneAndUpdate.mock.calls[0][1].$set;
      expect(setFields).not.toHaveProperty("sessions.$.id");
      expect(setFields).toHaveProperty("sessions.$.status", "break");
    });

    it("does not include undefined values", async () => {
      const session = makeSession({ id: "sess-1" });
      const doc = makeSprintDoc({ sessions: [session] });
      mockFindOneAndUpdate.mockResolvedValue(doc);

      await sprintService.updateSession("sess-1", {
        status: "completed",
        endedAt: undefined,
      });

      const setFields = mockFindOneAndUpdate.mock.calls[0][1].$set;
      expect(setFields).toHaveProperty("sessions.$.status", "completed");
      expect(setFields).not.toHaveProperty("sessions.$.endedAt");
    });
  });

  // ── getStats ──────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("computes statistics from sessions", async () => {
      const sessions = [
        makeSession({
          id: "s1",
          totalStudyMinutes: 40,
          pomodorosCompleted: 2,
          topicsCovered: ["Algebra", "Calculus"],
        }),
        makeSession({
          id: "s2",
          totalStudyMinutes: 25,
          pomodorosCompleted: 1,
          topicsCovered: ["Calculus", "Geometry"],
        }),
        makeSession({
          id: "s3",
          totalStudyMinutes: 50,
          pomodorosCompleted: 3,
          topicsCovered: ["Algebra"],
        }),
      ];
      const doc = makeSprintDoc({ sessions });
      // ensureDoc calls findOneAndUpdate
      mockFindOneAndUpdate.mockResolvedValue(doc);

      const stats = await sprintService.getStats();

      expect(stats.totalSessions).toBe(3);
      expect(stats.totalStudyMinutes).toBe(115); // 40 + 25 + 50
      expect(stats.totalPomodoros).toBe(6); // 2 + 1 + 3
      // Unique topics
      expect(stats.topicsCovered).toEqual(
        expect.arrayContaining(["Algebra", "Calculus", "Geometry"])
      );
      expect(stats.topicsCovered).toHaveLength(3);
      // Recent sessions = first 10
      expect(stats.recentSessions).toHaveLength(3);
    });

    it("returns empty stats when no sessions exist", async () => {
      const doc = makeSprintDoc({ sessions: [] });
      mockFindOneAndUpdate.mockResolvedValue(doc);

      const stats = await sprintService.getStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.totalStudyMinutes).toBe(0);
      expect(stats.totalPomodoros).toBe(0);
      expect(stats.topicsCovered).toEqual([]);
      expect(stats.recentSessions).toEqual([]);
    });

    it("returns at most 10 recent sessions", async () => {
      const sessions = Array.from({ length: 15 }, (_, i) =>
        makeSession({ id: `s${i}`, totalStudyMinutes: 10, pomodorosCompleted: 1, topicsCovered: [] })
      );
      const doc = makeSprintDoc({ sessions });
      mockFindOneAndUpdate.mockResolvedValue(doc);

      const stats = await sprintService.getStats();

      expect(stats.totalSessions).toBe(15);
      expect(stats.recentSessions).toHaveLength(10);
    });
  });
});
