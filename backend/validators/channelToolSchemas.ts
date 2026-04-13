import { z } from "zod";

export const toolQuizGenerateSchema = z.object({
  topic: z.string().optional(),
  serverName: z.string().optional(),
  count: z.number().int().min(1).max(50).optional(),
  difficulty: z.string().optional(),
  includeTrueFalse: z.boolean().optional(),
}).strict();

export const toolQuizAnswerSchema = z.object({
  nickname: z.string().min(1),
  questionId: z.string().min(1),
  selectedIndex: z.number().int().min(0),
}).strict();

export const toolFlashcardAddSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  topic: z.string().optional(),
  nickname: z.string().optional(),
}).strict();

export const toolFlashcardGenerateSchema = z.object({
  topic: z.string().optional(),
  serverName: z.string().optional(),
  count: z.number().int().min(1).max(50).optional(),
}).strict();

export const toolFlashcardExtractSchema = z.object({}).strict();

export const toolFlashcardReviewSchema = z.object({
  cardId: z.string().min(1),
  quality: z.number().int().min(0).max(5),
}).strict();

export const toolDeepDiveChatSchema = z.object({
  text: z.string().min(1),
  nickname: z.string().optional(),
  topic: z.string().optional(),
  serverName: z.string().optional(),
}).strict();

export const toolMindMapGenerateSchema = z.object({
  topic: z.string().optional(),
  serverName: z.string().optional(),
}).strict();

export const toolSprintStartSchema = z.object({
  studyMin: z.number().int().min(1).max(120).optional(),
  breakMin: z.number().int().min(1).max(60).optional(),
  nickname: z.string().optional(),
}).strict();

export const toolSprintStatusSchema = z.object({
  nickname: z.string().optional(),
  status: z.string().min(1),
}).strict();

export const toolNoteAddSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().optional(),
  nickname: z.string().optional(),
}).strict();

export const toolNoteEditSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  category: z.string().optional(),
}).strict();

export const toolLockSchema = z.object({}).strict();
