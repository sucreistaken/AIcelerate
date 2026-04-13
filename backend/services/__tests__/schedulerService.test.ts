import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Env vars (hoisted before all imports) ────────────────────────────────────
vi.hoisted(() => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-long!!";
  process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";
  process.env.NODE_ENV = "test";
});

// ── Mock logger ──────────────────────────────────────────────────────────────
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Mock weaknessService ─────────────────────────────────────────────────────
const mockGetGlobalWeaknessSummary = vi.fn();
const mockGetWeaknessForLesson = vi.fn();

vi.mock("../weaknessService", () => ({
  weaknessService: {
    getGlobalWeaknessSummary: (...args: unknown[]) => mockGetGlobalWeaknessSummary(...args),
    getWeaknessForLesson: (...args: unknown[]) => mockGetWeaknessForLesson(...args),
  },
}));

// ── Mock flashcardService ────────────────────────────────────────────────────
const mockGetDueCards = vi.fn();

vi.mock("../flashcardService", () => ({
  flashcardService: {
    getDueCards: (...args: unknown[]) => mockGetDueCards(...args),
  },
}));

// ── Mock courseDataService ────────────────────────────────────────────────────
const mockGetCourse = vi.fn();

vi.mock("../courseDataService", () => ({
  getCourse: (...args: unknown[]) => mockGetCourse(...args),
}));

// ── Mock idGenerator ─────────────────────────────────────────────────────────
let idCounter = 0;
vi.mock("../../utils/idGenerator", () => ({
  generateId: (prefix?: string) => {
    idCounter++;
    return prefix ? `${prefix}-test-${idCounter}` : `test-${idCounter}`;
  },
}));

// ── Mock ScheduleModel ───────────────────────────────────────────────────────
const mockFindById = vi.fn();
const mockFindOneAndUpdate = vi.fn();

vi.mock("../../models/Schedule", () => ({
  ScheduleModel: {
    findById: (...args: unknown[]) => mockFindById(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

// ── Import SUT after mocks ───────────────────────────────────────────────────
import {
  computeTopicScore,
  daysBetween,
  todayStr,
  gatherStudyTasks,
  computeWeeklyOverview,
  schedulerPersistence,
} from "../schedulerService";
import type { StreakData, DailyPlan, StudyTask } from "../schedulerService";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal weakness summary for mocking. */
function buildWeaknessSummary(
  topics: Array<{
    topicName: string;
    lessonIds: string[];
    averageRatio: number;
    recommendation?: string;
  }>
) {
  return {
    globalWeakTopics: topics.map((t) => ({
      topicName: t.topicName,
      lessonIds: t.lessonIds,
      averageRatio: t.averageRatio,
      recommendation: t.recommendation ?? "Review needed.",
    })),
    studyPriority: topics.map((t) => t.topicName),
    generatedAt: new Date().toISOString(),
  };
}

/** Build a minimal due flashcard for mocking. */
function buildDueCard(overrides: { topicName: string; lessonId: string }) {
  return {
    id: `card-${overrides.topicName}`,
    lessonId: overrides.lessonId,
    topicName: overrides.topicName,
    front: "Q?",
    back: "A.",
    source: "emphasis" as const,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 1,
    nextReviewDate: new Date(Date.now() - 86400000).toISOString(),
    state: "review" as const,
    createdAt: new Date().toISOString(),
  };
}

/** Build a course object for mocking. */
function buildCourse(overrides: {
  id: string;
  lessonIds: string[];
  examDate?: string;
}) {
  return {
    id: overrides.id,
    code: "CS101",
    name: "Test Course",
    lessonIds: overrides.lessonIds,
    settings: overrides.examDate
      ? { language: "en" as const, examDate: overrides.examDate }
      : { language: "en" as const },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  vi.clearAllMocks();
  idCounter = 0;

  // Default: no weakness, no due cards, no course
  mockGetGlobalWeaknessSummary.mockReturnValue(
    buildWeaknessSummary([])
  );
  mockGetDueCards.mockReturnValue([]);
  mockGetCourse.mockReturnValue(null);
  mockGetWeaknessForLesson.mockReturnValue(null);

  // Default: ScheduleModel returns chainable .lean()
  mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
  mockFindOneAndUpdate.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
});

// ── computeTopicScore ────────────────────────────────────────────────────────

describe("computeTopicScore", () => {
  it("should return base score 1 for average performance with no modifiers", () => {
    const score = computeTopicScore(0.7, "stable", 0, false, null);
    expect(score).toBe(1);
  });

  it("should apply critical weakness multiplier (ratio < 0.3)", () => {
    const score = computeTopicScore(0.1, "stable", 0, false, null);
    // base * 3 (weakness)
    expect(score).toBe(3);
  });

  it("should apply moderate weakness multiplier (0.3 <= ratio < 0.5)", () => {
    const score = computeTopicScore(0.4, "stable", 0, false, null);
    // base * 2
    expect(score).toBe(2);
  });

  it("should apply exam proximity multiplier (< 3 days)", () => {
    const score = computeTopicScore(0.7, "stable", 0, false, 2);
    // base * 3 (exam)
    expect(score).toBe(3);
  });

  it("should apply exam proximity multiplier (3-7 days)", () => {
    const score = computeTopicScore(0.7, "stable", 0, false, 5);
    // base * 2
    expect(score).toBe(2);
  });

  it("should apply exam proximity multiplier (7-14 days)", () => {
    const score = computeTopicScore(0.7, "stable", 0, false, 10);
    // base * 1.5
    expect(score).toBe(1.5);
  });

  it("should not apply exam multiplier when >= 14 days away", () => {
    const score = computeTopicScore(0.7, "stable", 0, false, 20);
    expect(score).toBe(1);
  });

  it("should apply recency bonus when daysSinceStudied >= 3", () => {
    const score = computeTopicScore(0.7, "stable", 5, false, null);
    // base * 1.5
    expect(score).toBe(1.5);
  });

  it("should apply flashcard due bonus", () => {
    const score = computeTopicScore(0.7, "stable", 0, true, null);
    // base * 1.3
    expect(score).toBe(1.3);
  });

  it("should apply declining trend penalty", () => {
    const score = computeTopicScore(0.7, "declining", 0, false, null);
    // base * 2
    expect(score).toBe(2);
  });

  it("should stack all multipliers together", () => {
    // ratio=0.1 (x3), exam=2days (x3), daysSince=5 (x1.5), dueCards (x1.3), declining (x2)
    const score = computeTopicScore(0.1, "declining", 5, true, 2);
    // 1 * 3 * 3 * 1.5 * 1.3 * 2 = 35.1
    expect(score).toBe(35.1);
  });

  it("should round to 2 decimal places", () => {
    // ratio=0.4 (x2), flashcard (x1.3) => 2 * 1.3 = 2.6
    const score = computeTopicScore(0.4, "stable", 0, true, null);
    expect(score).toBe(2.6);
  });
});

// ── daysBetween ──────────────────────────────────────────────────────────────

describe("daysBetween", () => {
  it("should return 0 for the same date", () => {
    expect(daysBetween("2026-01-15", "2026-01-15")).toBe(0);
  });

  it("should compute days between two dates correctly", () => {
    expect(daysBetween("2026-01-01", "2026-01-10")).toBe(9);
  });

  it("should return absolute value regardless of order", () => {
    expect(daysBetween("2026-01-10", "2026-01-01")).toBe(9);
  });

  it("should handle cross-month boundaries", () => {
    expect(daysBetween("2026-01-28", "2026-02-04")).toBe(7);
  });
});

// ── todayStr ─────────────────────────────────────────────────────────────────

describe("todayStr", () => {
  it("should return date in YYYY-MM-DD format", () => {
    const result = todayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should match current date", () => {
    const expected = new Date().toISOString().split("T")[0];
    expect(todayStr()).toBe(expected);
  });
});

// ── gatherStudyTasks ─────────────────────────────────────────────────────────

describe("gatherStudyTasks", () => {
  it("should return empty array when no weaknesses and no due cards", () => {
    const tasks = gatherStudyTasks();
    expect(tasks).toEqual([]);
  });

  it("should create deep-dive tasks for critical weaknesses (ratio < 0.3)", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Pointers", lessonIds: ["l1"], averageRatio: 0.15 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue({
      lessonId: "l1",
      lessonTitle: "Lesson 1",
      topics: [
        {
          topicName: "Pointers",
          ratio: 0.15,
          trend: "stable",
          lastAttemptDate: new Date().toISOString(),
          totalQuestions: 10,
          correctAnswers: 1,
          isWeak: true,
          sources: [],
        },
      ],
      analyzedAt: new Date().toISOString(),
    });

    const tasks = gatherStudyTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].taskType).toBe("deep-dive");
    expect(tasks[0].topicName).toBe("Pointers");
    expect(tasks[0].estimatedMinutes).toBe(30);
    expect(tasks[0].completed).toBe(false);
  });

  it("should create flashcard-review tasks for weak topics with due flashcards", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Recursion", lessonIds: ["l2"], averageRatio: 0.45 },
      ])
    );
    mockGetDueCards.mockReturnValue([
      buildDueCard({ topicName: "Recursion", lessonId: "l2" }),
    ]);
    mockGetWeaknessForLesson.mockReturnValue({
      lessonId: "l2",
      lessonTitle: "Lesson 2",
      topics: [
        {
          topicName: "Recursion",
          ratio: 0.45,
          trend: "stable",
          lastAttemptDate: new Date().toISOString(),
          totalQuestions: 10,
          correctAnswers: 4,
          isWeak: true,
          sources: [],
        },
      ],
      analyzedAt: new Date().toISOString(),
    });

    const tasks = gatherStudyTasks();
    expect(tasks.length).toBeGreaterThanOrEqual(1);

    const flashcardTask = tasks.find((t) => t.topicName === "Recursion");
    expect(flashcardTask).toBeDefined();
    expect(flashcardTask!.taskType).toBe("flashcard-review");
    expect(flashcardTask!.estimatedMinutes).toBe(15);
  });

  it("should create quiz-practice tasks for declining trends", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Sorting", lessonIds: ["l3"], averageRatio: 0.5 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue({
      lessonId: "l3",
      lessonTitle: "Lesson 3",
      topics: [
        {
          topicName: "Sorting",
          ratio: 0.5,
          trend: "declining",
          lastAttemptDate: new Date().toISOString(),
          totalQuestions: 10,
          correctAnswers: 5,
          isWeak: true,
          sources: [],
        },
      ],
      analyzedAt: new Date().toISOString(),
    });

    const tasks = gatherStudyTasks();
    const sortingTask = tasks.find((t) => t.topicName === "Sorting");
    expect(sortingTask).toBeDefined();
    expect(sortingTask!.taskType).toBe("quiz-practice");
    expect(sortingTask!.estimatedMinutes).toBe(25);
  });

  it("should create review-weakness tasks for moderate weaknesses without special conditions", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Arrays", lessonIds: ["l4"], averageRatio: 0.55 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue({
      lessonId: "l4",
      lessonTitle: "Lesson 4",
      topics: [
        {
          topicName: "Arrays",
          ratio: 0.55,
          trend: "stable",
          lastAttemptDate: new Date().toISOString(),
          totalQuestions: 10,
          correctAnswers: 5,
          isWeak: true,
          sources: [],
        },
      ],
      analyzedAt: new Date().toISOString(),
    });

    const tasks = gatherStudyTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].taskType).toBe("review-weakness");
    expect(tasks[0].estimatedMinutes).toBe(20);
  });

  it("should add flashcard-only tasks for due cards not covered by weaknesses", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(buildWeaknessSummary([]));
    mockGetDueCards.mockReturnValue([
      buildDueCard({ topicName: "Graphs", lessonId: "l5" }),
      buildDueCard({ topicName: "Graphs", lessonId: "l5" }),
      buildDueCard({ topicName: "Graphs", lessonId: "l5" }),
    ]);

    const tasks = gatherStudyTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].taskType).toBe("flashcard-review");
    expect(tasks[0].topicName).toBe("Graphs");
    // 3 cards * 3 min each = 9 minutes
    expect(tasks[0].estimatedMinutes).toBe(9);
  });

  it("should cap flashcard-only task time at 20 minutes", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(buildWeaknessSummary([]));
    const manyCards = Array.from({ length: 10 }, () =>
      buildDueCard({ topicName: "Trees", lessonId: "l6" })
    );
    mockGetDueCards.mockReturnValue(manyCards);

    const tasks = gatherStudyTasks();
    // Math.min(10 * 3, 20) = 20
    expect(tasks[0].estimatedMinutes).toBe(20);
  });

  it("should sort tasks by score descending", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Easy", lessonIds: ["l1"], averageRatio: 0.65 },
        { topicName: "Hard", lessonIds: ["l2"], averageRatio: 0.1 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const tasks = gatherStudyTasks();
    expect(tasks.length).toBe(2);
    // Hard (ratio 0.1) should score higher and come first
    expect(tasks[0].topicName).toBe("Hard");
    expect(tasks[1].topicName).toBe("Easy");
  });

  it("should filter tasks by courseId when provided", () => {
    mockGetCourse.mockReturnValue(
      buildCourse({ id: "c1", lessonIds: ["l1"] })
    );
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "InCourse", lessonIds: ["l1"], averageRatio: 0.3 },
        { topicName: "OutOfCourse", lessonIds: ["l99"], averageRatio: 0.2 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const tasks = gatherStudyTasks("c1");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].topicName).toBe("InCourse");
  });

  it("should compute daysToExam from course exam date", () => {
    const futureExam = new Date();
    futureExam.setDate(futureExam.getDate() + 5);
    const examStr = futureExam.toISOString().split("T")[0];

    mockGetCourse.mockReturnValue(
      buildCourse({ id: "c1", lessonIds: ["l1"], examDate: examStr })
    );
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Exam Topic", lessonIds: ["l1"], averageRatio: 0.6 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const tasks = gatherStudyTasks("c1");
    expect(tasks).toHaveLength(1);
    // Exam < 7 days => score multiplied by 2 (exam) * 1 (other factors) = 2 for this ratio
    expect(tasks[0].score).toBeGreaterThan(1);
  });

  it("should ignore exam date if it is in the past", () => {
    const pastExam = new Date();
    pastExam.setDate(pastExam.getDate() - 5);
    const examStr = pastExam.toISOString().split("T")[0];

    mockGetCourse.mockReturnValue(
      buildCourse({ id: "c1", lessonIds: ["l1"], examDate: examStr })
    );
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Past Exam Topic", lessonIds: ["l1"], averageRatio: 0.6 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const tasks = gatherStudyTasks("c1");
    expect(tasks).toHaveLength(1);
    // No exam multiplier applied => base score 1
    expect(tasks[0].score).toBe(1);
  });

  it("should not duplicate topics that appear in both weaknesses and due cards", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Overlap", lessonIds: ["l1"], averageRatio: 0.4 },
      ])
    );
    mockGetDueCards.mockReturnValue([
      buildDueCard({ topicName: "Overlap", lessonId: "l1" }),
    ]);
    mockGetWeaknessForLesson.mockReturnValue(null);

    const tasks = gatherStudyTasks();
    // "Overlap" appears once from weakness (flashcard-review type), not duplicated by due card loop
    const overlapTasks = tasks.filter((t) => t.topicName === "Overlap");
    expect(overlapTasks).toHaveLength(1);
  });

  it("should filter flashcard-only tasks by course lesson IDs", () => {
    mockGetCourse.mockReturnValue(
      buildCourse({ id: "c1", lessonIds: ["l1"] })
    );
    mockGetGlobalWeaknessSummary.mockReturnValue(buildWeaknessSummary([]));
    mockGetDueCards.mockReturnValue([
      buildDueCard({ topicName: "InCourseFlash", lessonId: "l1" }),
      buildDueCard({ topicName: "OutCourseFlash", lessonId: "l99" }),
    ]);

    const tasks = gatherStudyTasks("c1");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].topicName).toBe("InCourseFlash");
  });

  it("should assign unique IDs to each task", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "A", lessonIds: ["l1"], averageRatio: 0.3 },
        { topicName: "B", lessonIds: ["l2"], averageRatio: 0.4 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const tasks = gatherStudyTasks();
    const ids = tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── computeWeeklyOverview ────────────────────────────────────────────────────

describe("computeWeeklyOverview", () => {
  it("should produce 7 days of overview", () => {
    const overview = computeWeeklyOverview(undefined, 120);
    expect(overview.days).toHaveLength(7);
  });

  it("should have zero stats when no tasks exist", () => {
    const overview = computeWeeklyOverview(undefined, 120);
    expect(overview.weeklyStats.totalTasks).toBe(0);
    expect(overview.weeklyStats.totalMinutes).toBe(0);
    expect(overview.weeklyStats.focusAreas).toEqual([]);
  });

  it("should distribute tasks across days within daily budget", () => {
    // Create enough tasks to span multiple days
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Topic1", lessonIds: ["l1"], averageRatio: 0.2 },
        { topicName: "Topic2", lessonIds: ["l2"], averageRatio: 0.3 },
        { topicName: "Topic3", lessonIds: ["l3"], averageRatio: 0.4 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    // Budget = 35 min/day: first task is 30min (deep-dive), should fill day 1
    const overview = computeWeeklyOverview(undefined, 35);
    expect(overview.weeklyStats.totalTasks).toBeGreaterThan(0);
    // Should have at least one non-empty day
    const nonEmptyDays = overview.days.filter((d) => d.taskCount > 0);
    expect(nonEmptyDays.length).toBeGreaterThan(0);
  });

  it("should not exceed daily budget per day", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "T1", lessonIds: ["l1"], averageRatio: 0.2 },
        { topicName: "T2", lessonIds: ["l2"], averageRatio: 0.3 },
        { topicName: "T3", lessonIds: ["l3"], averageRatio: 0.4 },
        { topicName: "T4", lessonIds: ["l4"], averageRatio: 0.45 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const budget = 40;
    const overview = computeWeeklyOverview(undefined, budget);

    for (const day of overview.days) {
      // Each day should not exceed budget (with exception: an empty day adds at least one task)
      if (day.taskCount > 1) {
        expect(day.totalMinutes).toBeLessThanOrEqual(budget);
      }
    }
  });

  it("should assign at least one task to an empty day if tasks remain", () => {
    // A task of 60 min with budget of 25 — day would be empty, so 1 task forced
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "BigTask", lessonIds: ["l1"], averageRatio: 0.2 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const overview = computeWeeklyOverview(undefined, 10);
    // deep-dive = 30 min > budget 10, but day must get at least 1
    expect(overview.days[0].taskCount).toBe(1);
    expect(overview.weeklyStats.totalTasks).toBe(1);
  });

  it("should include correct start and end dates spanning 7 days", () => {
    const overview = computeWeeklyOverview(undefined, 120);
    const start = new Date(overview.startDate);
    const end = new Date(overview.endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(6); // 7 days = 6 day diff
  });

  it("should include day names in overview", () => {
    const validDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const overview = computeWeeklyOverview(undefined, 120);
    for (const day of overview.days) {
      expect(validDayNames).toContain(day.dayName);
    }
  });

  it("should limit focusAreas to 5 topics max", () => {
    const manyTopics = Array.from({ length: 8 }, (_, i) => ({
      topicName: `Topic${i}`,
      lessonIds: [`l${i}`],
      averageRatio: 0.2 + i * 0.02,
    }));
    mockGetGlobalWeaknessSummary.mockReturnValue(buildWeaknessSummary(manyTopics));
    mockGetWeaknessForLesson.mockReturnValue(null);

    const overview = computeWeeklyOverview(undefined, 300);
    expect(overview.weeklyStats.focusAreas.length).toBeLessThanOrEqual(5);
  });

  it("should pass courseId through to the result", () => {
    const overview = computeWeeklyOverview("c123", 120);
    expect(overview.courseId).toBe("c123");
  });
});

// ── schedulerPersistence.getNextSession ──────────────────────────────────────

describe("schedulerPersistence.getNextSession", () => {
  it("should return null task when no study tasks exist", () => {
    const result = schedulerPersistence.getNextSession();
    expect(result.task).toBeNull();
    expect(result.totalPending).toBe(0);
  });

  it("should return highest-priority task", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Low", lessonIds: ["l1"], averageRatio: 0.6 },
        { topicName: "High", lessonIds: ["l2"], averageRatio: 0.1 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const result = schedulerPersistence.getNextSession();
    expect(result.task).not.toBeNull();
    expect(result.task!.topicName).toBe("High");
    expect(result.totalPending).toBe(2);
  });

  it("should filter by courseId when provided", () => {
    mockGetCourse.mockReturnValue(
      buildCourse({ id: "c1", lessonIds: ["l1"] })
    );
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "InCourse", lessonIds: ["l1"], averageRatio: 0.3 },
        { topicName: "OutOfCourse", lessonIds: ["l99"], averageRatio: 0.1 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const result = schedulerPersistence.getNextSession("c1");
    expect(result.task!.topicName).toBe("InCourse");
    expect(result.totalPending).toBe(1);
  });
});

// ── schedulerPersistence.getDailyPlan ────────────────────────────────────────

describe("schedulerPersistence.getDailyPlan", () => {
  it("should generate a new plan when no cache exists", async () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Algorithms", lessonIds: ["l1"], averageRatio: 0.3 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const plan = await schedulerPersistence.getDailyPlan();
    expect(plan.date).toBe(todayStr());
    expect(plan.tasks.length).toBeGreaterThanOrEqual(1);
    expect(plan.summary).toContain("Algorithms");
    expect(plan.id).toMatch(/^plan-/);
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it("should return cached plan if fresh (< 2 hours old)", async () => {
    const today = todayStr();
    const cachedPlan: DailyPlan = {
      id: "plan-cached",
      courseId: undefined,
      date: today,
      generatedAt: new Date().toISOString(),
      tasks: [
        {
          id: "task-1",
          topicName: "Cached Topic",
          taskType: "review-weakness",
          reason: "Cached",
          estimatedMinutes: 20,
          score: 1,
          completed: false,
        },
      ],
      totalEstimatedMinutes: 20,
      summary: "Cached plan",
    };

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [cachedPlan],
        streak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        completedTasks: [],
      }),
    });

    const plan = await schedulerPersistence.getDailyPlan();
    expect(plan.id).toBe("plan-cached");
    expect(plan.tasks[0].topicName).toBe("Cached Topic");
    // Should NOT call findOneAndUpdate since cache was used
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it("should regenerate plan if cache is stale (> 2 hours old)", async () => {
    const today = todayStr();
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    const stalePlan: DailyPlan = {
      id: "plan-stale",
      courseId: undefined,
      date: today,
      generatedAt: threeHoursAgo,
      tasks: [],
      totalEstimatedMinutes: 0,
      summary: "Stale",
    };

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [stalePlan],
        streak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        completedTasks: [],
      }),
    });

    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Fresh", lessonIds: ["l1"], averageRatio: 0.4 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const plan = await schedulerPersistence.getDailyPlan();
    expect(plan.id).not.toBe("plan-stale");
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it("should respect budget when generating plan", async () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "T1", lessonIds: ["l1"], averageRatio: 0.2 },
        { topicName: "T2", lessonIds: ["l2"], averageRatio: 0.3 },
        { topicName: "T3", lessonIds: ["l3"], averageRatio: 0.4 },
        { topicName: "T4", lessonIds: ["l4"], averageRatio: 0.45 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    // Budget of 35 minutes: deep-dive T1=30min fits, T2=20min doesn't
    const plan = await schedulerPersistence.getDailyPlan(undefined, 35);
    expect(plan.totalEstimatedMinutes).toBeLessThanOrEqual(35);
  });

  it("should default to 120 minute budget", async () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "T1", lessonIds: ["l1"], averageRatio: 0.2 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const plan = await schedulerPersistence.getDailyPlan();
    expect(plan.totalEstimatedMinutes).toBeLessThanOrEqual(120);
  });

  it("should mark completed tasks from store", async () => {
    const today = todayStr();
    const cachedPlan: DailyPlan = {
      id: "plan-with-completed",
      courseId: undefined,
      date: today,
      generatedAt: new Date().toISOString(),
      tasks: [
        {
          id: "task-done",
          topicName: "Done",
          taskType: "review-weakness",
          reason: "test",
          estimatedMinutes: 20,
          score: 1,
          completed: false,
        },
        {
          id: "task-pending",
          topicName: "Pending",
          taskType: "review-weakness",
          reason: "test",
          estimatedMinutes: 20,
          score: 1,
          completed: false,
        },
      ],
      totalEstimatedMinutes: 40,
      summary: "Test plan",
    };

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [cachedPlan],
        streak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        completedTasks: ["task-done"],
      }),
    });

    const plan = await schedulerPersistence.getDailyPlan();
    const doneTask = plan.tasks.find((t) => t.id === "task-done");
    const pendingTask = plan.tasks.find((t) => t.id === "task-pending");
    expect(doneTask!.completed).toBe(true);
    expect(pendingTask!.completed).toBe(false);
  });

  it("should return friendly summary when no tasks exist", async () => {
    const plan = await schedulerPersistence.getDailyPlan();
    expect(plan.tasks).toHaveLength(0);
    expect(plan.summary).toContain("No study tasks");
  });

  it("should keep max 7 cached plans", async () => {
    // Store with 7 existing plans for other dates
    const existingPlans = Array.from({ length: 7 }, (_, i) => ({
      id: `plan-old-${i}`,
      courseId: undefined,
      date: `2025-01-0${i + 1}`,
      generatedAt: new Date().toISOString(),
      tasks: [] as StudyTask[],
      totalEstimatedMinutes: 0,
      summary: "Old plan",
    }));

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: existingPlans,
        streak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        completedTasks: [],
      }),
    });

    await schedulerPersistence.getDailyPlan();

    // Verify findOneAndUpdate was called with capped plans (7 max after slice(-7))
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const updateCall = mockFindOneAndUpdate.mock.calls[0] as unknown[];
    const updateBody = updateCall[1] as { $set: { dailyPlans: DailyPlan[] } };
    expect(updateBody.$set.dailyPlans.length).toBeLessThanOrEqual(7);
  });
});

// ── schedulerPersistence.getWeeklyOverview ────────────────────────────────────

describe("schedulerPersistence.getWeeklyOverview", () => {
  it("should delegate to computeWeeklyOverview with default budget", () => {
    const result = schedulerPersistence.getWeeklyOverview();
    expect(result.days).toHaveLength(7);
  });

  it("should pass custom budget through", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "T1", lessonIds: ["l1"], averageRatio: 0.2 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const result = schedulerPersistence.getWeeklyOverview(undefined, 30);
    // With 30 min budget, deep-dive (30 min) just fits in one day
    expect(result.weeklyStats.totalMinutes).toBeLessThanOrEqual(30);
  });
});

// ── schedulerPersistence.completeTask ─────────────────────────────────────────

describe("schedulerPersistence.completeTask", () => {
  it("should mark task completed and return streak data", async () => {
    const today = todayStr();
    mockFindOneAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        streak: {
          currentStreak: 1,
          longestStreak: 1,
          lastStudyDate: today,
          studyDates: [today],
        },
        completedTasks: ["task-123"],
      }),
    });

    const result = await schedulerPersistence.completeTask("task-123");
    expect(result.ok).toBe(true);
    expect(result.streak.currentStreak).toBe(1);
    expect(result.streak.lastStudyDate).toBe(today);
  });

  it("should use aggregation pipeline update for atomicity", async () => {
    mockFindOneAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        streak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        completedTasks: [],
      }),
    });

    await schedulerPersistence.completeTask("task-abc");

    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const args = mockFindOneAndUpdate.mock.calls[0] as unknown[];
    // First arg: filter
    expect(args[0]).toEqual({ _id: "global" });
    // Second arg: aggregation pipeline (array)
    expect(Array.isArray(args[1])).toBe(true);
    // Third arg: options with upsert and new
    const options = args[2] as { upsert: boolean; new: boolean };
    expect(options.upsert).toBe(true);
    expect(options.new).toBe(true);
  });

  it("should handle null response from database gracefully", async () => {
    mockFindOneAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    const result = await schedulerPersistence.completeTask("task-missing");
    expect(result.ok).toBe(true);
    expect(result.streak.currentStreak).toBe(0);
  });

  it("should build consecutive streak from study dates", async () => {
    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

    mockFindOneAndUpdate.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: today,
          studyDates: [twoDaysAgo, yesterday, today],
        },
        completedTasks: ["task-x"],
      }),
    });

    const result = await schedulerPersistence.completeTask("task-x");
    expect(result.streak.currentStreak).toBe(3);
    expect(result.streak.longestStreak).toBe(3);
  });
});

// ── schedulerPersistence.getStreak ───────────────────────────────────────────

describe("schedulerPersistence.getStreak", () => {
  it("should return zero streak when no study dates exist", async () => {
    const streak = await schedulerPersistence.getStreak();
    expect(streak.currentStreak).toBe(0);
    expect(streak.longestStreak).toBe(0);
    expect(streak.lastStudyDate).toBeNull();
  });

  it("should compute current streak from consecutive study dates", async () => {
    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: today,
          studyDates: [yesterday, today],
        },
        completedTasks: [],
      }),
    });

    const streak = await schedulerPersistence.getStreak();
    expect(streak.currentStreak).toBe(2);
    expect(streak.longestStreak).toBe(2);
    expect(streak.lastStudyDate).toBe(today);
  });

  it("should reset streak when last study was more than 1 day ago", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        streak: {
          currentStreak: 5,
          longestStreak: 10,
          lastStudyDate: threeDaysAgo,
          studyDates: [threeDaysAgo],
        },
        completedTasks: [],
      }),
    });

    const streak = await schedulerPersistence.getStreak();
    expect(streak.currentStreak).toBe(0);
    // Longest streak should be preserved
    expect(streak.longestStreak).toBe(10);
  });

  it("should preserve longest streak even when current resets", async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        streak: {
          currentStreak: 3,
          longestStreak: 15,
          lastStudyDate: weekAgo,
          studyDates: [weekAgo],
        },
        completedTasks: [],
      }),
    });

    const streak = await schedulerPersistence.getStreak();
    expect(streak.currentStreak).toBe(0);
    expect(streak.longestStreak).toBe(15);
  });

  it("should update longest streak when current exceeds it", async () => {
    const today = todayStr();
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      dates.push(d.toISOString().split("T")[0]);
    }

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        streak: {
          currentStreak: 0,
          longestStreak: 3,
          lastStudyDate: today,
          studyDates: dates,
        },
        completedTasks: [],
      }),
    });

    const streak = await schedulerPersistence.getStreak();
    expect(streak.currentStreak).toBe(7);
    expect(streak.longestStreak).toBe(7); // exceeds old longest of 3
  });

  it("should handle non-consecutive dates correctly (gap in middle)", async () => {
    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    // Skip a day
    const fourDaysAgo = new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0];

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: today,
          studyDates: [fourDaysAgo, yesterday, today],
        },
        completedTasks: [],
      }),
    });

    const streak = await schedulerPersistence.getStreak();
    // Only yesterday + today are consecutive
    expect(streak.currentStreak).toBe(2);
  });

  it("should cap studyDates to last 365 days", async () => {
    const today = todayStr();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 400);
    const oldDateStr = oldDate.toISOString().split("T")[0];

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: today,
          studyDates: [oldDateStr, today],
        },
        completedTasks: [],
      }),
    });

    const streak = await schedulerPersistence.getStreak();
    // Old date (400 days ago) should be filtered out
    expect(streak.studyDates).not.toContain(oldDateStr);
    expect(streak.studyDates).toContain(today);
  });

  it("should handle single study date (streak of 1) when it is today", async () => {
    const today = todayStr();

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: today,
          studyDates: [today],
        },
        completedTasks: [],
      }),
    });

    const streak = await schedulerPersistence.getStreak();
    expect(streak.currentStreak).toBe(1);
  });

  it("should handle single study date (yesterday) as streak of 1 with diff <= 1", async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: yesterday,
          studyDates: [yesterday],
        },
        completedTasks: [],
      }),
    });

    const streak = await schedulerPersistence.getStreak();
    // Yesterday is 1 day ago, which is <= 1, so streak should be counted
    expect(streak.currentStreak).toBe(1);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("should handle course with no settings/examDate", () => {
    mockGetCourse.mockReturnValue(
      buildCourse({ id: "c1", lessonIds: ["l1"] })
    );
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "NoExam", lessonIds: ["l1"], averageRatio: 0.4 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const tasks = gatherStudyTasks("c1");
    expect(tasks).toHaveLength(1);
    // No exam multiplier — score based only on weakness (ratio 0.4 => *2)
    expect(tasks[0].score).toBe(2);
  });

  it("should handle course with empty lessonIds", () => {
    mockGetCourse.mockReturnValue(
      buildCourse({ id: "c1", lessonIds: [] })
    );
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Orphan", lessonIds: ["l1"], averageRatio: 0.3 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    const tasks = gatherStudyTasks("c1");
    // No overlap with empty course lessonIds, all topics filtered out
    expect(tasks).toHaveLength(0);
  });

  it("should handle nonexistent courseId gracefully", () => {
    mockGetCourse.mockReturnValue(null);
    mockGetGlobalWeaknessSummary.mockReturnValue(
      buildWeaknessSummary([
        { topicName: "Topic", lessonIds: ["l1"], averageRatio: 0.4 },
      ])
    );
    mockGetWeaknessForLesson.mockReturnValue(null);

    // When course is null, courseLessonIds is null, so no filtering happens
    const tasks = gatherStudyTasks("nonexistent");
    expect(tasks).toHaveLength(1);
  });

  it("should handle empty store from database (all defaults)", async () => {
    mockFindById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    const streak = await schedulerPersistence.getStreak();
    expect(streak.currentStreak).toBe(0);
    expect(streak.longestStreak).toBe(0);
    expect(streak.lastStudyDate).toBeNull();
    expect(streak.studyDates).toEqual([]);
  });

  it("should handle store with missing streak field", async () => {
    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [],
        completedTasks: [],
        // streak field is missing
      }),
    });

    const streak = await schedulerPersistence.getStreak();
    expect(streak.currentStreak).toBe(0);
  });

  it("should handle store with missing dailyPlans field", async () => {
    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        streak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        completedTasks: [],
        // dailyPlans field is missing
      }),
    });

    const plan = await schedulerPersistence.getDailyPlan();
    // Should generate a new plan without errors
    expect(plan.date).toBe(todayStr());
  });

  it("should handle many due cards for same topic (score threshold)", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(buildWeaknessSummary([]));
    const sixCards = Array.from({ length: 6 }, () =>
      buildDueCard({ topicName: "ManyCards", lessonId: "l1" })
    );
    mockGetDueCards.mockReturnValue(sixCards);

    const tasks = gatherStudyTasks();
    expect(tasks).toHaveLength(1);
    // count > 5 => score 2.5
    expect(tasks[0].score).toBe(2.5);
  });

  it("should handle few due cards for same topic (score threshold)", () => {
    mockGetGlobalWeaknessSummary.mockReturnValue(buildWeaknessSummary([]));
    const threeCards = Array.from({ length: 3 }, () =>
      buildDueCard({ topicName: "FewCards", lessonId: "l1" })
    );
    mockGetDueCards.mockReturnValue(threeCards);

    const tasks = gatherStudyTasks();
    expect(tasks).toHaveLength(1);
    // count <= 5 => score 1.5
    expect(tasks[0].score).toBe(1.5);
  });

  it("should handle getDailyPlan with specific courseId caching", async () => {
    const today = todayStr();
    const coursePlan: DailyPlan = {
      id: "plan-course",
      courseId: "c1",
      date: today,
      generatedAt: new Date().toISOString(),
      tasks: [],
      totalEstimatedMinutes: 0,
      summary: "Course plan",
    };
    const globalPlan: DailyPlan = {
      id: "plan-global",
      courseId: undefined,
      date: today,
      generatedAt: new Date().toISOString(),
      tasks: [],
      totalEstimatedMinutes: 0,
      summary: "Global plan",
    };

    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [coursePlan, globalPlan],
        streak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        completedTasks: [],
      }),
    });

    const result = await schedulerPersistence.getDailyPlan("c1");
    expect(result.id).toBe("plan-course");

    // Reset for second call — return same store
    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dailyPlans: [coursePlan, globalPlan],
        streak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        completedTasks: [],
      }),
    });

    const globalResult = await schedulerPersistence.getDailyPlan();
    expect(globalResult.id).toBe("plan-global");
  });
});
