// services/schedulerService.ts
// Business logic extracted from schedulerController: scoring, task gathering, weekly overview.
// Now also includes MongoDB-backed persistence for daily plans, streaks, and completed tasks.
import { weaknessService } from "./weaknessService";
import { flashcardService } from "./flashcardService";
import { getCourse } from "./courseDataService";
import { generateId } from "../utils/idGenerator";
import { ScheduleModel } from "../models/Schedule";

export type StudyTask = {
  id: string;
  courseId?: string;
  lessonId?: string;
  topicName: string;
  taskType: "review-weakness" | "flashcard-review" | "quiz-practice" | "deep-dive" | "revision";
  reason: string;
  estimatedMinutes: number;
  score: number;
  completed: boolean;
};

export type DailyPlan = {
  id: string;
  courseId?: string;
  date: string;
  generatedAt: string;
  tasks: StudyTask[];
  totalEstimatedMinutes: number;
  summary: string;
};

export type WeeklyOverview = {
  courseId?: string;
  startDate: string;
  endDate: string;
  days: Array<{
    date: string;
    dayName: string;
    totalMinutes: number;
    taskCount: number;
    highlights: string[];
  }>;
  weeklyStats: {
    totalTasks: number;
    totalMinutes: number;
    focusAreas: string[];
  };
};

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  studyDates: string[];
};

type ScheduleStore = {
  dailyPlans: DailyPlan[];
  streak: StreakData;
  completedTasks: string[];
};

const SCHEDULE_DOC_ID = "global";
const rid = () => generateId("task");

// ---- Scoring helpers ----

export function computeTopicScore(
  ratio: number,
  trend: "improving" | "stable" | "declining",
  daysSinceStudied: number,
  hasDueFlashcards: boolean,
  daysToExam: number | null
): number {
  let score = 1.0;

  // Weakness weight
  if (ratio < 0.3) score *= 3;
  else if (ratio < 0.5) score *= 2;

  // Exam proximity
  if (daysToExam !== null) {
    if (daysToExam < 3) score *= 3;
    else if (daysToExam < 7) score *= 2;
    else if (daysToExam < 14) score *= 1.5;
  }

  // Recency bonus
  if (daysSinceStudied >= 3) score *= 1.5;

  // Flashcard due bonus
  if (hasDueFlashcards) score *= 1.3;

  // Declining penalty
  if (trend === "declining") score *= 2;

  return Math.round(score * 100) / 100;
}

export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ---- Core: gather study tasks ----

export function gatherStudyTasks(courseId?: string): StudyTask[] {
  const weaknessSummary = weaknessService.getGlobalWeaknessSummary();
  const dueCards = flashcardService.getDueCards();
  const now = new Date().toISOString();

  // Group due flashcards by topicName
  const dueByTopic = new Map<string, number>();
  for (const card of dueCards) {
    const count = dueByTopic.get(card.topicName) || 0;
    dueByTopic.set(card.topicName, count + 1);
  }

  // Get exam date if course specified
  let daysToExam: number | null = null;
  let courseLessonIds: Set<string> | null = null;

  if (courseId) {
    const course = getCourse(courseId);
    if (course?.settings?.examDate) {
      daysToExam = daysBetween(todayStr(), course.settings.examDate);
      // Only count if exam is in the future
      if (new Date(course.settings.examDate) < new Date()) daysToExam = null;
    }
    if (course) {
      courseLessonIds = new Set(course.lessonIds);
    }
  }

  const tasks: StudyTask[] = [];
  const seenTopics = new Set<string>();

  // From weakness data
  for (const weakTopic of weaknessSummary.globalWeakTopics) {
    // If filtering by course, check lesson overlap
    if (courseLessonIds) {
      const hasOverlap = weakTopic.lessonIds.some((lid) => courseLessonIds!.has(lid));
      if (!hasOverlap) continue;
    }

    if (seenTopics.has(weakTopic.topicName)) continue;
    seenTopics.add(weakTopic.topicName);

    // Get weakness details from lesson data
    let trend: "improving" | "stable" | "declining" = "stable";
    let lastAttemptDate = now;

    for (const lid of weakTopic.lessonIds) {
      const analysis = weaknessService.getWeaknessForLesson(lid);
      if (analysis) {
        const topic = analysis.topics.find((t) => t.topicName === weakTopic.topicName);
        if (topic) {
          trend = topic.trend;
          lastAttemptDate = topic.lastAttemptDate || now;
          break;
        }
      }
    }

    const daysSinceStudied = daysBetween(lastAttemptDate, now);
    const hasDue = dueByTopic.has(weakTopic.topicName);

    const score = computeTopicScore(
      weakTopic.averageRatio,
      trend,
      daysSinceStudied,
      hasDue,
      daysToExam
    );

    // Determine task type
    let taskType: StudyTask["taskType"] = "review-weakness";
    let reason = "";
    let estimatedMinutes = 20;

    if (weakTopic.averageRatio < 0.3) {
      taskType = "deep-dive";
      reason = `Critical weakness (${Math.round(weakTopic.averageRatio * 100)}% score). Deep study recommended.`;
      estimatedMinutes = 30;
    } else if (hasDue) {
      taskType = "flashcard-review";
      reason = `Weak topic with ${dueByTopic.get(weakTopic.topicName)} due flashcards. Review needed.`;
      estimatedMinutes = 15;
    } else if (trend === "declining") {
      taskType = "quiz-practice";
      reason = `Performance declining. Practice quizzes to reinforce understanding.`;
      estimatedMinutes = 25;
    } else {
      taskType = "review-weakness";
      reason = `Below target (${Math.round(weakTopic.averageRatio * 100)}% score). Quick review needed.`;
      estimatedMinutes = 20;
    }

    tasks.push({
      id: rid(),
      courseId,
      lessonId: weakTopic.lessonIds[0],
      topicName: weakTopic.topicName,
      taskType,
      reason,
      estimatedMinutes,
      score,
      completed: false,
    });
  }

  // Add flashcard-only tasks for due cards not already covered
  for (const [topicName, count] of dueByTopic) {
    if (seenTopics.has(topicName)) continue;

    // Check course filter
    if (courseLessonIds) {
      const card = dueCards.find((c) => c.topicName === topicName);
      if (card && !courseLessonIds.has(card.lessonId)) continue;
    }

    seenTopics.add(topicName);

    tasks.push({
      id: rid(),
      courseId,
      lessonId: dueCards.find((c) => c.topicName === topicName)?.lessonId,
      topicName,
      taskType: "flashcard-review",
      reason: `${count} flashcard${count > 1 ? "s" : ""} due for review.`,
      estimatedMinutes: Math.min(count * 3, 20),
      score: count > 5 ? 2.5 : 1.5,
      completed: false,
    });
  }

  // Sort by score descending
  tasks.sort((a, b) => b.score - a.score);

  return tasks;
}

// ---- Weekly overview computation ----

export function computeWeeklyOverview(courseId: string | undefined, dailyBudget: number): WeeklyOverview {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const tasks = gatherStudyTasks(courseId);

  const days: WeeklyOverview["days"] = [];
  const now = new Date();

  // Distribute tasks across the week
  let taskIdx = 0;
  let totalTasks = 0;
  let totalMinutes = 0;
  const focusAreas = new Set<string>();

  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];

    let dayMinutes = 0;
    let dayTaskCount = 0;
    const highlights: string[] = [];

    while (taskIdx < tasks.length && dayMinutes + tasks[taskIdx].estimatedMinutes <= dailyBudget) {
      dayMinutes += tasks[taskIdx].estimatedMinutes;
      dayTaskCount++;
      if (highlights.length < 2) highlights.push(tasks[taskIdx].topicName);
      focusAreas.add(tasks[taskIdx].topicName);
      taskIdx++;
    }

    // If still have tasks and day is empty, add at least one
    if (dayTaskCount === 0 && taskIdx < tasks.length) {
      dayMinutes = tasks[taskIdx].estimatedMinutes;
      dayTaskCount = 1;
      highlights.push(tasks[taskIdx].topicName);
      focusAreas.add(tasks[taskIdx].topicName);
      taskIdx++;
    }

    totalTasks += dayTaskCount;
    totalMinutes += dayMinutes;

    days.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      totalMinutes: dayMinutes,
      taskCount: dayTaskCount,
      highlights,
    });
  }

  const startDate = days[0].date;
  const endDate = days[6].date;

  return {
    courseId,
    startDate,
    endDate,
    days,
    weeklyStats: {
      totalTasks,
      totalMinutes,
      focusAreas: [...focusAreas].slice(0, 5),
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// MongoDB-backed persistence (migrated from schedulerController)
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_STORE: ScheduleStore = {
  dailyPlans: [],
  streak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
  completedTasks: [],
};

async function loadSchedules(): Promise<ScheduleStore> {
  const doc = await ScheduleModel.findById(SCHEDULE_DOC_ID).lean() as ScheduleStore | null;
  if (!doc) return { ...DEFAULT_STORE };
  return {
    dailyPlans: doc.dailyPlans ?? [],
    streak: doc.streak ?? DEFAULT_STORE.streak,
    completedTasks: doc.completedTasks ?? [],
  };
}


function recalcStreak(streak: StreakData, today: string): StreakData {
  // Cap studyDates to last 365 days to prevent unbounded growth
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const cappedDates = streak.studyDates.filter((d) => d >= cutoffStr);

  const sorted = [...cappedDates].sort();
  if (sorted.length === 0) {
    return { currentStreak: 0, longestStreak: streak.longestStreak, lastStudyDate: null, studyDates: cappedDates };
  }

  const lastDate = sorted[sorted.length - 1];

  // If last study date is more than 1 day ago, streak resets
  const diffDays = daysBetween(lastDate, today);
  if (diffDays > 1) {
    return {
      currentStreak: 0,
      longestStreak: streak.longestStreak,
      lastStudyDate: lastDate,
      studyDates: cappedDates,
    };
  }

  // Count consecutive days backwards from last date — use Set for O(1) lookup
  const dateSet = new Set(sorted);
  let current = 0;
  const checkDate = new Date(lastDate);

  while (true) {
    const checkStr = checkDate.toISOString().split("T")[0];
    if (dateSet.has(checkStr)) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const longest = Math.max(streak.longestStreak, current);

  return {
    currentStreak: current,
    longestStreak: longest,
    lastStudyDate: lastDate,
    studyDates: cappedDates,
  };
}

export const schedulerPersistence = {
  /**
   * Get the highest-priority single task.
   */
  getNextSession(courseId?: string): { task: StudyTask | null; totalPending: number } {
    const tasks = gatherStudyTasks(courseId);
    return {
      task: tasks[0] || null,
      totalPending: tasks.length,
    };
  },

  /**
   * Get daily plan, cached for 2 hours in MongoDB.
   */
  async getDailyPlan(courseId?: string, budgetMinutes?: number): Promise<DailyPlan> {
    const store = await loadSchedules();
    const today = todayStr();

    // Check cache
    const cached = store.dailyPlans.find(
      (p) => p.date === today && (p.courseId || undefined) === courseId
    );
    if (cached) {
      const cacheAge = Date.now() - new Date(cached.generatedAt).getTime();
      if (cacheAge < 2 * 60 * 60 * 1000) {
        // Update completed status from store
        for (const task of cached.tasks) {
          if (store.completedTasks.includes(task.id)) {
            task.completed = true;
          }
        }
        return cached;
      }
    }

    // Generate new plan
    const budget = budgetMinutes ?? 120;
    const allTasks = gatherStudyTasks(courseId);

    // Fill budget
    const planTasks: StudyTask[] = [];
    let totalMinutes = 0;

    for (const task of allTasks) {
      if (totalMinutes + task.estimatedMinutes > budget) continue;
      if (store.completedTasks.includes(task.id)) {
        task.completed = true;
      }
      planTasks.push(task);
      totalMinutes += task.estimatedMinutes;
    }

    const plan: DailyPlan = {
      id: generateId("plan"),
      courseId,
      date: today,
      generatedAt: new Date().toISOString(),
      tasks: planTasks,
      totalEstimatedMinutes: totalMinutes,
      summary: planTasks.length > 0
        ? `${planTasks.length} tasks planned: ${planTasks.map((t) => t.topicName).slice(0, 3).join(", ")}${planTasks.length > 3 ? "..." : ""}`
        : "No study tasks identified. Great job staying on top of your material!",
    };

    // Cache: atomically update daily plans (keep max 7)
    const existingPlans = store.dailyPlans.filter(
      (p) => !(p.date === today && (p.courseId || undefined) === courseId)
    );
    existingPlans.push(plan);
    const cappedPlans = existingPlans.slice(-7);
    await ScheduleModel.findOneAndUpdate(
      { _id: SCHEDULE_DOC_ID },
      { $set: { dailyPlans: cappedPlans } },
      { upsert: true }
    );

    return plan;
  },

  /**
   * Get weekly overview (7-day forward view).
   */
  getWeeklyOverview(courseId?: string, dailyBudget?: number): WeeklyOverview {
    return computeWeeklyOverview(courseId, dailyBudget ?? 120);
  },

  /**
   * Mark a task as completed and update streak.
   * Single atomic aggregation pipeline — no crash window, no race condition.
   * Source: MongoDB docs recommend single findOneAndUpdate over multi-step read-modify-write.
   * Uses $setUnion for uniqueness (like $addToSet) + $slice for DB-level cap.
   * Streak is computed from returned document — no second write needed since
   * getStreak() always recomputes from studyDates on read.
   */
  async completeTask(taskId: string): Promise<{ ok: boolean; streak: StreakData }> {
    const today = todayStr();

    const updated = await ScheduleModel.findOneAndUpdate(
      { _id: SCHEDULE_DOC_ID },
      [
        { $set: {
          // $setUnion ensures uniqueness (equivalent to $addToSet)
          completedTasks: { $slice: [{ $setUnion: [{ $ifNull: ["$completedTasks", []] }, [taskId]] }, -500] },
          "streak.studyDates": { $slice: [{ $setUnion: [{ $ifNull: ["$streak.studyDates", []] }, [today]] }, -365] },
          "streak.lastStudyDate": today,
        }},
      ],
      { upsert: true, new: true, updatePipeline: true }
    ).lean() as ScheduleStore | null;

    const store = updated ?? { ...DEFAULT_STORE };
    const streak = recalcStreak(store.streak ?? DEFAULT_STORE.streak, today);

    return { ok: true, streak };
  },

  /**
   * Get current streak data.
   */
  async getStreak(): Promise<StreakData> {
    const store = await loadSchedules();
    const today = todayStr();
    return recalcStreak(store.streak, today);
  },
};
