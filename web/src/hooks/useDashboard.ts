import { useEffect, useMemo, useCallback } from "react";
import { useLessonStore } from "../stores/lessonStore";
import { useUiStore } from "../stores/uiStore";
import { useCourseStore } from "../stores/courseStore";
import { useGamificationStore, getLevelInfo, getLevelProgress } from "../stores/gamificationStore";
import { useFlashcardStore } from "../stores/flashcardStore";
import type { ModeId } from "../types";

interface XpEvent {
  action: string;
  amount: number;
  timestamp: number;
}

interface LessonSummary {
  id: string;
  title: string;
  date?: string;
  highlights?: string[];
  plan?: { modules?: any[] };
  hasPlan?: boolean;
}

export interface SparklinePoint {
  day: string;
  value: number;
}

export interface WeeklyBar {
  dayKey: string;
  value: number;
}

export interface CourseCard {
  id: string;
  code: string;
  name: string;
  lessonCount: number;
  completedCount: number;
}

function computeSparkline(history: XpEvent[]): SparklinePoint[] {
  const days: SparklinePoint[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    days.push({ day: key, value: 0 });
  }
  for (const ev of history) {
    const key = new Date(ev.timestamp).toISOString().split("T")[0];
    const point = days.find((d) => d.day === key);
    if (point) point.value += ev.amount;
  }
  return days;
}

function computeWeeklyXp(history: XpEvent[]): WeeklyBar[] {
  const dayKeys = [
    "welcome.mon", "welcome.tue", "welcome.wed", "welcome.thu",
    "welcome.fri", "welcome.sat", "welcome.sun",
  ];
  const now = new Date();
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const bars: WeeklyBar[] = dayKeys.map((k) => ({ dayKey: k, value: 0 }));

  for (const ev of history) {
    const d = new Date(ev.timestamp);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays > todayIdx) continue; // older than this week
    const evIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    if (evIdx >= 0 && evIdx < 7) bars[evIdx].value += ev.amount;
  }
  return bars;
}

export function useDashboard() {
  const lessons = useLessonStore((s) => s.lessons) as LessonSummary[];
  const setCurrentLessonId = useLessonStore((s) => s.setCurrentLessonId);
  const setMode = useUiStore((s) => s.setMode);
  const courses = useCourseStore((s) => s.courses);
  const { totalXp, streakDays, history } = useGamificationStore();
  const flashcardStats = useFlashcardStore((s) => s.stats);
  const fetchStats = useFlashcardStore((s) => s.fetchStats);

  useEffect(() => {
    if (!flashcardStats) fetchStats();
  }, []);

  const level = getLevelInfo(totalXp);
  const levelProgress = getLevelProgress(totalXp);
  const totalLessons = lessons.length;
  const totalCourses = courses.length;
  const hasActivity = totalLessons > 0 || totalXp > 0;

  const recentLessons = useMemo(
    () =>
      [...lessons]
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
        .slice(0, 5),
    [lessons]
  );

  const sparklineData = useMemo(() => computeSparkline(history), [history]);
  const weeklyXp = useMemo(() => computeWeeklyXp(history), [history]);

  const courseCards: CourseCard[] = useMemo(
    () =>
      courses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        lessonCount: c.lessonIds.length,
        completedCount: c.lessonIds.filter((id: string) =>
          lessons.find((l) => l.id === id && (l.hasPlan ?? !!l.plan))
        ).length,
      })),
    [courses, lessons]
  );

  const handleContinue = useCallback(
    (lessonId: string) => {
      setCurrentLessonId(lessonId);
      setMode("plan");
    },
    [setCurrentLessonId, setMode]
  );

  const handleNewLesson = useCallback(() => {
    setMode("create-lesson");
  }, [setMode]);

  const handleGoToCourse = useCallback(
    (courseId: string) => {
      useCourseStore.getState().selectCourse(courseId);
    },
    []
  );

  return {
    // Data
    totalXp,
    streakDays,
    history,
    level,
    levelProgress,
    totalLessons,
    totalCourses,
    hasActivity,
    recentLessons,
    sparklineData,
    weeklyXp,
    courseCards,
    flashcardStats,
    // Actions
    setMode,
    handleContinue,
    handleNewLesson,
    handleGoToCourse,
  };
}
