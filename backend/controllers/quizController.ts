// backend/controllers/quizController.ts
// Thin wrapper — business logic lives in quizPackService.

import { quizPackService } from "../services/quizPackService";

// 1. Quiz generation
export const generateQuizFromEmphases = (count = 5, lessonIds?: string[]) => {
  return quizPackService.generateFromEmphases(count, lessonIds);
};

// 2. Get quiz pack by ID
export const getQuizPack = (packId: string) => {
  return quizPackService.getPack(packId);
};

// 3. Score a quiz pack
export const scoreQuizPack = (
  packId: string,
  answers: Array<{ id: string; answer: string | boolean }>
) => {
  return quizPackService.scorePack(packId, answers);
};
