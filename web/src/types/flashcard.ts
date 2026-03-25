// Flashcard / Spaced Repetition types

export interface Flashcard {
  id: string;
  lessonId: string;
  topicName: string;
  front: string;
  back: string;
  source: "emphasis" | "cheatsheet" | "miniQuiz" | "loModule" | "ai-generated";
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string;
  state: "new" | "learning" | "review" | "graduated";
  createdAt: string;
  lastReviewedAt?: string;
}

export interface FlashcardStats {
  total: number;
  new: number;
  learning: number;
  review: number;
  graduated: number;
  dueToday: number;
}
