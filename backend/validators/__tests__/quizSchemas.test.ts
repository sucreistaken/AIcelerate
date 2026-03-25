import { describe, it, expect } from "vitest";
import { quizFromPlanSchema, quizAnswersSchema, quizEvalSchema, quizEvalBatchSchema } from "../quizSchemas";

describe("quizFromPlanSchema", () => {
  it("accepts valid plan object", () => {
    const result = quizFromPlanSchema.safeParse({ plan: { modules: [] } });
    expect(result.success).toBe(true);
  });

  it("rejects null plan", () => {
    const result = quizFromPlanSchema.safeParse({ plan: null });
    expect(result.success).toBe(false);
  });

  it("accepts optional lessonId", () => {
    const result = quizFromPlanSchema.safeParse({ plan: {}, lessonId: "abc" });
    expect(result.success).toBe(true);
  });
});

describe("quizAnswersSchema", () => {
  it("accepts valid questions array", () => {
    const result = quizAnswersSchema.safeParse({
      questions: ["What is X?", "Define Y"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty questions", () => {
    const result = quizAnswersSchema.safeParse({ questions: [] });
    expect(result.success).toBe(false);
  });
});

describe("quizEvalSchema", () => {
  it("accepts valid evaluation input", () => {
    const result = quizEvalSchema.safeParse({
      q: "What is OOP?",
      student_answer: "Object oriented programming",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty question", () => {
    const result = quizEvalSchema.safeParse({ q: "", student_answer: "answer" });
    expect(result.success).toBe(false);
  });

  it("rejects empty student answer", () => {
    const result = quizEvalSchema.safeParse({ q: "question", student_answer: "" });
    expect(result.success).toBe(false);
  });
});

describe("quizEvalBatchSchema", () => {
  it("accepts batch items", () => {
    const result = quizEvalBatchSchema.safeParse({
      items: [
        { q: "Q1", student_answer: "A1" },
        { q: "Q2", student_answer: "A2" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty items", () => {
    const result = quizEvalBatchSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });
});
