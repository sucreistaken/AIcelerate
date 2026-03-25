// Quiz / Weakness Tracker types

export interface TopicScore {
  topicName: string;
  moduleIndex?: number;
  loId?: string;
  totalQuestions: number;
  correctAnswers: number;
  ratio: number;
  isWeak: boolean;
  sources: string[];
  lastAttemptDate: string;
  trend: "improving" | "stable" | "declining";
}

export interface WeaknessAnalysis {
  lessonId: string;
  lessonTitle: string;
  topics: TopicScore[];
  analyzedAt: string;
}

export interface WeaknessSummary {
  globalWeakTopics: Array<{
    topicName: string;
    lessonIds: string[];
    averageRatio: number;
    recommendation: string;
  }>;
  studyPriority: string[];
  generatedAt: string;
}
