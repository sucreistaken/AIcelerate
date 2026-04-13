import { z } from "zod";

/** Shared empty-body schema — rejects unexpected body payloads on action-only routes */
export const emptyBodySchema = z.object({}).strict();

// POST /quiz/generate
export const quizGenerateSchema = z.object({
  count: z.number().int().min(1).max(50).optional(),
  lessonIds: z.array(z.string().min(1)).max(50).optional(),
  lessonId: z.string().min(1).optional(),
}).strict();

// POST /quiz/:packId/submit
export const quizSubmitSchema = z.object({
  answers: z.array(z.object({
    id: z.string().min(1),
    answer: z.union([z.string(), z.boolean()]),
  }).strict()).min(1).max(200),
  lessonId: z.string().min(1).optional(),
}).strict();

// POST /flashcards/generate/:lessonId — no body needed, but strict empty
export const flashcardGenerateSchema = z.object({}).strict();

// POST /flashcards/:cardId/review
export const flashcardReviewSchema = z.object({
  quality: z.number().int().min(0).max(5),
}).strict();

// POST /scheduler/complete-task
export const schedulerCompleteTaskSchema = z.object({
  taskId: z.string().min(1),
}).strict();

// POST /shares
export const shareCreateSchema = z.object({
  lessonId: z.string().min(1),
}).strict();

// POST /shares/:shareId/comments
export const shareCommentSchema = z.object({
  text: z.string().min(1).max(5000),
}).strict();

// POST /adaptive-quiz/start
export const adaptiveQuizStartSchema = z.object({
  courseId: z.string().min(1),
  lessonIds: z.array(z.string().min(1)).max(100).optional(),
}).strict();

// POST /flashcards
export const flashcardCreateSchema = z.object({
  lessonId: z.string().min(1, "lessonId is required"),
  front: z.string().min(1, "front is required"),
  back: z.string().min(1, "back is required"),
  topicName: z.string().optional(),
}).strict();

// PATCH /flashcards/:cardId
export const flashcardUpdateSchema = z.object({
  front: z.string().min(1).optional(),
  back: z.string().min(1).optional(),
}).strict();

// POST /xp/add
export const xpAddSchema = z.object({
  xp: z.number().int().min(1).max(10000),
  source: z.string().min(1),
}).strict();

// POST /adaptive-quiz/:sessionId/answer
export const adaptiveQuizAnswerSchema = z.object({
  itemId: z.string().min(1, "itemId is required"),
  answer: z.string().min(1, "answer is required"),
}).strict();
