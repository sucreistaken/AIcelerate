// controllers/schedulerController.ts
// Thin wrapper — business logic lives in schedulerService.

import { schedulerPersistence } from "../services/schedulerService";
import { sprintService } from "../services/sprintService";
import type {
  StudyTask,
  DailyPlan,
  WeeklyOverview,
  StreakData,
} from "../services/schedulerService";

export type { StudyTask, DailyPlan, WeeklyOverview, StreakData };

// 1. Get next session: highest-priority single task
export function getNextSession(courseId?: string): { task: StudyTask | null; totalPending: number } {
  return schedulerPersistence.getNextSession(courseId);
}

// 2. Get daily plan (cached for 2 hours)
export async function getDailyPlan(courseId?: string): Promise<DailyPlan> {
  const settings = await sprintService.getSettings();
  const budgetMinutes = settings.studyDurationMin * 3;
  return schedulerPersistence.getDailyPlan(courseId, budgetMinutes);
}

// 3. Get weekly overview (7-day forward view)
export async function getWeeklyOverview(courseId?: string): Promise<WeeklyOverview> {
  const settings = await sprintService.getSettings();
  const dailyBudget = settings.studyDurationMin * 3;
  return schedulerPersistence.getWeeklyOverview(courseId, dailyBudget);
}

// 4. Complete a task
export function completeTask(taskId: string): Promise<{ ok: boolean; streak: StreakData }> {
  return schedulerPersistence.completeTask(taskId);
}

// 5. Get streak
export function getStreak(): Promise<StreakData> {
  return schedulerPersistence.getStreak();
}
