// types/lesson.ts — Lesson domain types, shared by services and controllers.

import type {
  LessonPlan, LoAlignment, MindmapCache, MindmapModuleCacheEntry,
  DeviationResult, CheatSheet, ConfidenceScore, PlanEmphasis,
} from "./index";

// Alias for backward compat — PlanEmphasis and Emphasis are identical
export type Emphasis = PlanEmphasis;

export type LoStudyModule = {
  loId: string;
  loTitle: string;
  oneLineGist: string;
  coreIdeas: string[];
  mustRemember: string[];
  intuitiveExplanation: string;
  examples: {
    label: string;
    description: string;
  }[];
  typicalQuestions: string[];
  commonTraps: string[];
  miniQuiz: {
    question: string;
    answer: string;
    why: string;
  }[];
  recommended_study_time_min: number;
};

export type LessonLoModules = {
  lessonId: string;
  modules: LoStudyModule[];
};

export type Lesson = {
  id: string;
  userId?: string;
  title: string;
  date: string;
  transcript: string;
  slideText: string;
  plan?: LessonPlan;
  summary?: string;
  highlights?: string[];
  professorEmphases?: Emphasis[];
  quiz?: Array<{ question: string; answer?: string }>;
  cheatSheet?: CheatSheet;
  quizPacks?: Array<{ packId: string; createdAt: string; lastScore?: number }>;
  progress?: { lastMode?: string; percent?: number };
  createdAt?: string;
  updatedAt?: string;
  courseId?: string;
  courseCode?: string;
  learningOutcomes?: string[];
  loAlignment?: LoAlignment;
  loModules?: LessonLoModules;
  mindmapCache?: MindmapCache;
  mindmapModuleCache?: { [moduleIndex: string]: MindmapModuleCacheEntry };
  deviation?: DeviationResult;
  digest?: import("../services/lessonDigestService").LessonDigest;
  planConfidence?: ConfidenceScore;
  cheatSheetConfidence?: ConfidenceScore;
};

// Re-export CheatSheet for convenience
export type { CheatSheet } from "./index";
