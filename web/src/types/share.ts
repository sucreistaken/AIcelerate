// Share, Sprint, and Connection types

import type { Plan, CheatSheet, LoStudyModule, Emphasis } from './lesson';
import type { TopicScore } from './quiz';

// Sprint types
export interface SprintSettings {
  studyDurationMin: number;
  breakDurationMin: number;
  examDate?: string;
  intensiveMode: boolean;
}

export interface SprintSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  lessonId?: string;
  status: "studying" | "break" | "completed" | "abandoned";
  pomodorosCompleted: number;
  topicsCovered: string[];
  totalStudyMinutes: number;
}

// Connection types
export interface ConceptConnection {
  concept: string;
  lessonIds: string[];
  lessonTitles: string[];
  strength: number;
  relatedConcepts: string[];
  aiInsight?: string;
}

// Share types
export interface SharedBundle {
  shareId: string;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  lessonId: string;
  bundle: {
    title: string;
    plan: Plan | null;
    cheatSheet: CheatSheet | null;
    quiz: string[];
    loModules: LoStudyModule[] | null;
    emphases: Emphasis[];
    notes: string[];
    weakTopics?: TopicScore[];
  };
  comments: Array<{ author: string; text: string; createdAt: string }>;
  accessCount: number;
}
