// controllers/flashcardController.ts
// Thin wrapper — all business logic lives in services/flashcardService.ts.
// Re-exports are kept for backward compatibility with routes, other services, and cache/index.ts.

export type { Flashcard, ReviewEntry } from "../services/flashcardService";
export { flashcardService } from "../services/flashcardService";

import { flashcardService } from "../services/flashcardService";
import type { Flashcard } from "../services/flashcardService";

// ── Backward-compatible function exports ────────────────────────────

export const loadFlashcards = () => flashcardService.loadAll();

export const saveFlashcards = (cards: Flashcard[]) => flashcardService.saveAll(cards);

export const createCard = (
  lessonId: string,
  topicName: string,
  front: string,
  back: string,
  source: Flashcard["source"]
) => flashcardService.create(lessonId, topicName, front, back, source);

export const generateFlashcardsForLesson = (lessonId: string) =>
  flashcardService.generateForLesson(lessonId);

export const reviewCard = (cardId: string, quality: number) =>
  flashcardService.review(cardId, quality);

export const getDueCards = () => flashcardService.getDueCards();

export const getFlashcards = (lessonId?: string) => flashcardService.getAll(lessonId);

export const getFlashcardStats = () => flashcardService.getStats();

export const deleteFlashcard = (cardId: string) => flashcardService.delete(cardId);
