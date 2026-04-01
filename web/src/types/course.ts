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

// ── Confidence Scoring (OPT-15) ──
export interface ConfidenceScore {
  coverage: number;
  accuracy: number;
  completeness: number;
  flags: string[];
  scoredAt: string;
}

// ── Knowledge Graph (OPT-12) ──
export interface ConceptNode {
  id: string;
  name: string;
  type: "concept" | "principle" | "formula" | "technique" | "definition";
  lessonIds: string[];
  strength: number;
}

export interface ConceptEdge {
  from: string;
  to: string;
  relationship: "prerequisite" | "extends" | "applies" | "example_of";
  confidence: number;
  evidence?: string;
}

export interface KnowledgeGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  builtAt: string;
  version: number;
}

// ── Adaptive Quiz (OPT-13) ──
export interface AdaptiveQuizQuestion {
  id: string;
  question: string;
  topicName: string;
}

export interface AdaptiveQuizSessionState {
  sessionId: string;
  currentTheta: number;
  questionsAsked: number;
  isComplete: boolean;
  stoppingReason?: string;
  nextQuestion: AdaptiveQuizQuestion | null;
  poolSize?: number;
}

export interface AdaptiveQuizSummary {
  sessionId: string;
  finalTheta: number;
  totalQuestions: number;
  correct: number;
  partial: number;
  incorrect: number;
  stoppingReason: string;
  topicBreakdown: Array<{ topicName: string; correct: number; total: number }>;
}

// ── LO Progress (OPT-11) ──
export interface LOProgress {
  loId: string;
  loTitle: string;
  lessonsContributing: string[];
  quizScores: number[];
  flashcardMastery: { total: number; graduated: number; learning: number; new: number };
  overallConfidence: number;
  masteryLevel: "not_started" | "beginning" | "developing" | "proficient" | "mastered";
  recommendedNext: string;
}

export interface LODashboardData {
  courseId: string;
  courseName: string;
  totalLOs: number;
  loProgress: LOProgress[];
  overallMastery: number;
  studyPriority: string[];
  generatedAt: string;
}
