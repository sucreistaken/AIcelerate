import { z } from "zod";

export const quizFromPlanSchema = z.object({
  plan: z.record(z.string(), z.unknown()).refine((v) => v != null, "plan is required"),
  lessonId: z.string().optional(),
}).strict();

export const quizAnswersSchema = z.object({
  questions: z.array(z.string()).min(1, "questions are required"),
  lectureText: z.string().optional(),
  slidesText: z.string().optional(),
  plan: z.record(z.string(), z.unknown()).optional(),
  lessonId: z.string().optional(),
}).strict();

export const quizEvalSchema = z.object({
  q: z.string().min(1, "q is required"),
  student_answer: z.string().min(1, "student_answer is required"),
  lectureText: z.string().optional(),
  slidesText: z.string().optional(),
  lessonId: z.string().optional(),
}).strict();

export const quizEvalBatchSchema = z.object({
  items: z.array(z.object({
    q: z.string(),
    student_answer: z.string(),
  }).strict()).min(1, "items are required"),
  lectureText: z.string().optional(),
  slidesText: z.string().optional(),
  lessonId: z.string().optional(),
}).strict();
