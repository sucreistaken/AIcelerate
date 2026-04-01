export interface AdaptiveQuizItem {
  id: string;
  question: string;
  expectedAnswer: string;
  difficulty: number;            // -3 to +3 (IRT scale, 0 = medium)
  topicName: string;
  lessonId: string;
  historicalCorrectRate: number; // 0-1 from past responses
}

export interface AdaptiveQuizResponse {
  itemId: string;
  response: "correct" | "partial" | "incorrect";
  thetaAfter: number;
}

export interface AdaptiveQuizState {
  sessionId: string;
  courseId: string;
  currentTheta: number;           // ability estimate, starts at 0
  thetaHistory: number[];
  questionsAsked: AdaptiveQuizResponse[];
  remainingPool: string[];        // item IDs not yet asked
  isComplete: boolean;
  stoppingReason?: "converged" | "max_questions" | "user_stopped";
  createdAt: string;
}

export interface AdaptiveQuizConfig {
  maxQuestions: number;            // default 10
  convergenceThreshold: number;   // default 0.3
  convergenceWindow: number;      // default 3
}

export interface AdaptiveQuizSummary {
  sessionId: string;
  finalTheta: number;
  totalQuestions: number;
  correct: number;
  partial: number;
  incorrect: number;
  stoppingReason: string;
  topicBreakdown: Array<{
    topicName: string;
    correct: number;
    total: number;
  }>;
}
