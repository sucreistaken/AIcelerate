import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock AppNotificationModel ───────────────────────────────────────────────
const mockFind = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockUpdateMany = vi.fn();
const mockCountDocuments = vi.fn();
const mockCreate = vi.fn();
const mockInsertMany = vi.fn();

vi.mock("../../models/AppNotification", () => ({
  AppNotificationModel: {
    find: (...args: any[]) => mockFind(...args),
    findByIdAndUpdate: (...args: any[]) => mockFindByIdAndUpdate(...args),
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
    updateMany: (...args: any[]) => mockUpdateMany(...args),
    countDocuments: (...args: any[]) => mockCountDocuments(...args),
    create: (...args: any[]) => mockCreate(...args),
    insertMany: (...args: any[]) => mockInsertMany(...args),
  },
}));

// ── Mock flashcardService ────────────────────────────────────────────────
const mockGetDueCards = vi.fn();

vi.mock("../../services/flashcardService", () => ({
  flashcardService: {
    getDueCards: (...args: any[]) => mockGetDueCards(...args),
  },
}));

// ── Mock weaknessService ─────────────────────────────────────────────────
const mockGetGlobalWeaknessSummary = vi.fn();

vi.mock("../../services/weaknessService", () => ({
  weaknessService: {
    getGlobalWeaknessSummary: (...args: any[]) => mockGetGlobalWeaknessSummary(...args),
  },
}));

// ── Mock courseDataService ───────────────────────────────────────────────
const mockListCourses = vi.fn();

vi.mock("../../services/courseDataService", () => ({
  listCourses: (...args: any[]) => mockListCourses(...args),
}));

// ── Mock schedulerService ────────────────────────────────────────────────
const mockGetStreak = vi.fn();

vi.mock("../../services/schedulerService", () => ({
  schedulerPersistence: {
    getStreak: (...args: any[]) => mockGetStreak(...args),
  },
}));

import { notificationService } from "../notificationService";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeNotifDoc(overrides: Record<string, any> = {}) {
  return {
    _id: overrides._id ?? "notif-1",
    type: overrides.type ?? "flashcard-due",
    title: overrides.title ?? "Test Notification",
    message: overrides.message ?? "You have items to review.",
    severity: overrides.severity ?? "info",
    dismissed: overrides.dismissed ?? false,
    createdAt: overrides.createdAt ?? new Date("2025-06-01"),
    dismissedAt: overrides.dismissedAt ?? undefined,
    actionTarget: overrides.actionTarget ?? undefined,
    metadata: overrides.metadata ?? undefined,
    ...overrides,
  };
}

// Chainable .sort().limit().lean() AND direct .lean() (for batch dedup query)
function chainableFind(docs: any[]) {
  return {
    lean: vi.fn().mockResolvedValue(docs),
    sort: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(docs),
      }),
    }),
  };
}

// Chainable .lean()
function chainableLean(doc: any) {
  return { lean: vi.fn().mockResolvedValue(doc) };
}

describe("notificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Defaults for checkAndGenerate dependencies
    mockGetDueCards.mockReturnValue([]);
    mockGetGlobalWeaknessSummary.mockReturnValue({
      globalWeakTopics: [],
      studyPriority: [],
      generatedAt: new Date().toISOString(),
    });
    mockListCourses.mockReturnValue([]);
    // Note: service code calls getStreak() without await, so mock returns plain object
    mockGetStreak.mockReturnValue({
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      studyDates: [],
    });
    // Default: no recent notification (batch dedup query returns empty array)
    mockFind.mockReturnValue(chainableFind([]));
    mockCountDocuments.mockResolvedValue(0);
  });

  // ── listNotifications ─────────────────────────────────────────────────

  describe("listNotifications()", () => {
    it("returns all notifications", async () => {
      const docs = [makeNotifDoc({ _id: "n1" }), makeNotifDoc({ _id: "n2" })];
      mockFind.mockReturnValue(chainableFind(docs));

      const result = await notificationService.listNotifications("test-user");

      expect(mockFind).toHaveBeenCalledWith({ userId: "test-user" });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("n1");
      expect(result[1].id).toBe("n2");
    });

    it("returns only unread notifications when unreadOnly=true", async () => {
      const docs = [makeNotifDoc({ _id: "n1", dismissed: false })];
      mockFind.mockReturnValue(chainableFind(docs));

      const result = await notificationService.listNotifications("test-user", true);

      expect(mockFind).toHaveBeenCalledWith({ userId: "test-user", dismissed: false });
      expect(result).toHaveLength(1);
    });
  });

  // ── dismissNotification ───────────────────────────────────────────────

  describe("dismissNotification()", () => {
    it("marks notification as dismissed", async () => {
      const doc = makeNotifDoc({ _id: "n1", dismissed: true, dismissedAt: new Date() });
      mockFindOneAndUpdate.mockReturnValue(chainableLean(doc));

      const result = await notificationService.dismissNotification("test-user", "n1");

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: "n1", userId: "test-user" },
        { $set: { dismissed: true, dismissedAt: expect.any(Date) } },
        { returnDocument: 'after' }
      );
      expect(result).not.toBeNull();
      expect(result!.dismissed).toBe(true);
    });

    it("returns null if notification not found", async () => {
      mockFindOneAndUpdate.mockReturnValue(chainableLean(null));

      const result = await notificationService.dismissNotification("test-user", "nonexistent");

      expect(result).toBeNull();
    });
  });

  // ── dismissAllNotifications ───────────────────────────────────────────

  describe("dismissAllNotifications()", () => {
    it("bulk dismisses all unread notifications", async () => {
      mockUpdateMany.mockResolvedValue({ modifiedCount: 5 });

      const count = await notificationService.dismissAllNotifications("test-user");

      expect(mockUpdateMany).toHaveBeenCalledWith(
        { userId: "test-user", dismissed: false },
        { $set: { dismissed: true, dismissedAt: expect.any(Date) } }
      );
      expect(count).toBe(5);
    });

    it("returns 0 when no unread notifications", async () => {
      mockUpdateMany.mockResolvedValue({ modifiedCount: 0 });

      const count = await notificationService.dismissAllNotifications("test-user");

      expect(count).toBe(0);
    });
  });

  // ── getUnreadCount ────────────────────────────────────────────────────

  describe("getUnreadCount()", () => {
    it("returns count of undismissed notifications", async () => {
      mockCountDocuments.mockResolvedValue(7);

      const count = await notificationService.getUnreadCount("test-user");

      expect(mockCountDocuments).toHaveBeenCalledWith({ userId: "test-user", dismissed: false });
      expect(count).toBe(7);
    });
  });

  // ── createNotification ────────────────────────────────────────────────

  describe("createNotification()", () => {
    it("creates notification with proper fields", async () => {
      const doc = makeNotifDoc({
        _id: "n-new",
        type: "weakness-alert",
        title: "Weak Topic",
        message: "Review needed",
        severity: "warning",
        dismissed: false,
        actionTarget: { mode: "weakness" },
        metadata: { topicCount: 2 },
        toObject() { return this; },
      });
      mockCreate.mockResolvedValue(doc);

      const result = await notificationService.createNotification("test-user", {
        type: "weakness-alert",
        title: "Weak Topic",
        message: "Review needed",
        severity: "warning",
        actionTarget: { mode: "weakness" },
        metadata: { topicCount: 2 },
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "weakness-alert",
          title: "Weak Topic",
          message: "Review needed",
          severity: "warning",
          dismissed: false,
          actionTarget: { mode: "weakness" },
          metadata: { topicCount: 2 },
        })
      );
      expect(result.id).toBe("n-new");
      expect(result.type).toBe("weakness-alert");
      expect(result.dismissed).toBe(false);
    });
  });

  // ── checkAndGenerateNotifications ─────────────────────────────────────

  describe("checkAndGenerateNotifications()", () => {
    // Helper: make insertMany work for generation tests
    function setupCreateMock() {
      mockInsertMany.mockImplementation((docs: any[]) => {
        return docs.map((doc: any, i: number) => ({
          ...doc,
          _id: `gen-${i + 1}`,
          createdAt: new Date(),
          toObject() { return this; },
        }));
      });
    }

    it("triggers flashcard-due rule when cards are due", async () => {
      setupCreateMock();
      mockGetDueCards.mockReturnValue([{ id: "fc-1" }, { id: "fc-2" }, { id: "fc-3" }]);

      const result = await notificationService.checkAndGenerateNotifications("test-user");

      const flashcardNotif = result.find((n) => n.type === "flashcard-due");
      expect(flashcardNotif).toBeDefined();
      expect(flashcardNotif!.title).toBe("Flashcards Due");
      expect(flashcardNotif!.message).toContain("3 flashcards");
      expect(flashcardNotif!.severity).toBe("info");
    });

    it("sets warning severity when >10 flashcards are due", async () => {
      setupCreateMock();
      const cards = Array.from({ length: 15 }, (_, i) => ({ id: `fc-${i}` }));
      mockGetDueCards.mockReturnValue(cards);

      const result = await notificationService.checkAndGenerateNotifications("test-user");

      const flashcardNotif = result.find((n) => n.type === "flashcard-due");
      expect(flashcardNotif).toBeDefined();
      expect(flashcardNotif!.severity).toBe("warning");
    });

    it("triggers weakness-alert rule for declining topics", async () => {
      setupCreateMock();
      mockGetGlobalWeaknessSummary.mockReturnValue({
        globalWeakTopics: [
          { topicName: "Integrals", averageRatio: 0.25, lessonIds: ["l-1"] },
          { topicName: "Limits", averageRatio: 0.4, lessonIds: ["l-2"] },
        ],
        studyPriority: [],
        generatedAt: new Date().toISOString(),
      });

      const result = await notificationService.checkAndGenerateNotifications("test-user");

      const weaknessNotif = result.find((n) => n.type === "weakness-alert");
      expect(weaknessNotif).toBeDefined();
      expect(weaknessNotif!.title).toBe("Weak Topics Detected");
      expect(weaknessNotif!.message).toContain("Integrals");
      expect(weaknessNotif!.message).toContain("25%");
      // worstTopic.averageRatio < 0.3 => critical
      expect(weaknessNotif!.severity).toBe("critical");
    });

    it("sets warning severity for weakness when ratio >= 0.3", async () => {
      setupCreateMock();
      mockGetGlobalWeaknessSummary.mockReturnValue({
        globalWeakTopics: [
          { topicName: "Derivatives", averageRatio: 0.35, lessonIds: ["l-1"] },
        ],
        studyPriority: [],
        generatedAt: new Date().toISOString(),
      });

      const result = await notificationService.checkAndGenerateNotifications("test-user");

      const weaknessNotif = result.find((n) => n.type === "weakness-alert");
      expect(weaknessNotif).toBeDefined();
      expect(weaknessNotif!.severity).toBe("warning");
    });

    it("deduplication prevents double-fire for flashcard-due", async () => {
      setupCreateMock();
      mockGetDueCards.mockReturnValue([{ id: "fc-1" }]);
      // Simulate recent notification exists — batch dedup query returns a matching doc
      mockFind.mockReturnValue(chainableFind([
        { type: "flashcard-due", createdAt: new Date(), metadata: {} },
      ]));

      const result = await notificationService.checkAndGenerateNotifications("test-user");

      const flashcardNotif = result.find((n) => n.type === "flashcard-due");
      expect(flashcardNotif).toBeUndefined();
    });

    it("triggers streak milestone notification", async () => {
      setupCreateMock();
      // Note: service code calls getStreak() without await, so mock returns plain object
      mockGetStreak.mockReturnValue({
        currentStreak: 7,
        longestStreak: 7,
        lastStudyDate: new Date().toISOString(),
        studyDates: [],
      });

      const result = await notificationService.checkAndGenerateNotifications("test-user");

      const streakNotif = result.find((n) => n.type === "streak-milestone");
      expect(streakNotif).toBeDefined();
      expect(streakNotif!.title).toBe("7-Day Streak!");
      expect(streakNotif!.message).toContain("7 days in a row");
      expect(streakNotif!.severity).toBe("info");
    });

    it("does not trigger streak for non-milestone values", async () => {
      setupCreateMock();
      // Note: service code calls getStreak() without await, so mock returns plain object
      mockGetStreak.mockReturnValue({
        currentStreak: 5,
        longestStreak: 5,
        lastStudyDate: new Date().toISOString(),
        studyDates: [],
      });

      const result = await notificationService.checkAndGenerateNotifications("test-user");

      const streakNotif = result.find((n) => n.type === "streak-milestone");
      expect(streakNotif).toBeUndefined();
    });

    it("does not fire weakness-alert when no topics are below 0.5", async () => {
      setupCreateMock();
      mockGetGlobalWeaknessSummary.mockReturnValue({
        globalWeakTopics: [
          { topicName: "Algebra", averageRatio: 0.75, lessonIds: ["l-1"] },
        ],
        studyPriority: [],
        generatedAt: new Date().toISOString(),
      });

      const result = await notificationService.checkAndGenerateNotifications("test-user");

      const weaknessNotif = result.find((n) => n.type === "weakness-alert");
      expect(weaknessNotif).toBeUndefined();
    });

    it("does not fire flashcard-due when no cards are due", async () => {
      setupCreateMock();
      mockGetDueCards.mockReturnValue([]);

      const result = await notificationService.checkAndGenerateNotifications("test-user");

      const flashcardNotif = result.find((n) => n.type === "flashcard-due");
      expect(flashcardNotif).toBeUndefined();
    });

    it("handles singular flashcard message", async () => {
      setupCreateMock();
      mockGetDueCards.mockReturnValue([{ id: "fc-1" }]);

      const result = await notificationService.checkAndGenerateNotifications("test-user");

      const flashcardNotif = result.find((n) => n.type === "flashcard-due");
      expect(flashcardNotif).toBeDefined();
      expect(flashcardNotif!.message).toContain("1 flashcard ");
      // No trailing 's'
      expect(flashcardNotif!.message).not.toContain("1 flashcards");
    });
  });
});
