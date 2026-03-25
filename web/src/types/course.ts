// Course types

import type { Plan, CheatSheet } from './lesson';
import type { Flashcard } from './flashcard';

export interface CourseKnowledgeIndex {
  builtAt: string;
  version: number;
  overview: {
    totalLessons: number;
    topicProgression: string[];
    courseThemes: string[];
  };
  lessonDigests: Array<{
    lessonId: string;
    title: string;
    weekNumber: number;
    keyTopics: string[];
    emphasisHighlights: string[];
    coveredLOIds: string[];
  }>;
  conceptBridges: Array<{
    concept: string;
    appearsInWeeks: number[];
    evolution: string;
  }>;
  loCoverage: Array<{
    loId: string;
    loTitle: string;
    coveredByLessons: string[];
    coverageLevel: "full" | "partial" | "none";
  }>;
  progressSnapshot: {
    weakTopics: string[];
    strongTopics: string[];
    quizAverageScore: number;
    flashcardsDue: number;
    completedLessons: number;
  };
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  lessonIds: string[];
  learningOutcomes?: string[];
  knowledgeIndex?: CourseKnowledgeIndex;
  settings?: { language: "tr" | "en"; examDate?: string };
  createdAt: string;
  updatedAt: string;
}

export interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  lessonStatuses: Array<{
    lessonId: string;
    title: string;
    hasTranscript: boolean;
    hasPlan: boolean;
    quizScores: number[];
    flashcardStats: { total: number; new: number; learning: number; review: number; graduated: number };
  }>;
  overallQuizAvg: number;
  flashcardSummary: { total: number; new: number; learning: number; review: number; graduated: number; due: number };
  weakTopics: string[];
  strongTopics: string[];
}

export interface ScheduleSlot {
  time: "Morning" | "Afternoon" | "Evening";
  activity: string;
  lessonRef?: string;
  tip?: string;
}

export interface WeeklySchedule {
  courseId: string;
  generatedAt: string;
  examDate?: string;
  days: Array<{
    day: string;
    slots: ScheduleSlot[];
  }>;
  tips: string[];
}

export interface CourseExport {
  exportedAt: string;
  course: Course;
  lessons: Array<{
    id: string;
    title: string;
    plan?: Plan;
    cheatSheet?: CheatSheet;
  }>;
  flashcards: Flashcard[];
  weakTopics: string[];
}
