// Scheduler types

export interface StudyTask {
  id: string;
  courseId?: string;
  lessonId?: string;
  topicName: string;
  taskType: "review-weakness" | "flashcard-review" | "quiz-practice" | "deep-dive" | "revision";
  reason: string;
  estimatedMinutes: number;
  score: number;
  completed: boolean;
}

export interface DailyPlan {
  id: string;
  courseId?: string;
  date: string;
  generatedAt: string;
  tasks: StudyTask[];
  totalEstimatedMinutes: number;
  summary: string;
}

export interface WeeklyOverview {
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
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  studyDates: string[];
}
