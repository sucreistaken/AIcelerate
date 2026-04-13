// types/course.ts — Course domain types.
import type { Lesson } from "./lesson";

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
  userId?: string;
  code: string;
  name: string;
  description?: string;
  lessonIds: string[];
  learningOutcomes?: string[];
  knowledgeIndex?: CourseKnowledgeIndex;
  knowledgeGraph?: import("./knowledgeGraph").KnowledgeGraph;
  settings?: { language: "tr" | "en"; examDate?: string };
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardStats {
  total: number;
  new: number;
  learning: number;
  review: number;
  graduated: number;
}

export interface LessonStatus {
  lessonId: string;
  title: string;
  hasTranscript: boolean;
  hasPlan: boolean;
  quizScores: number[];
  flashcardStats: FlashcardStats;
}

export interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  lessonStatuses: LessonStatus[];
  overallQuizAvg: number;
  flashcardSummary: FlashcardStats & { due: number };
  weakTopics: string[];
  strongTopics: string[];
}

// Re-export Lesson for convenience
export type { Lesson };
