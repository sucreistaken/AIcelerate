import { describe, it, expect } from "vitest";
import { createCourseSchema, courseChatSchema, studyScheduleSchema } from "../courseSchemas";

describe("createCourseSchema", () => {
  it("accepts valid course", () => {
    const result = createCourseSchema.safeParse({ code: "CS101", name: "Intro to CS" });
    expect(result.success).toBe(true);
  });

  it("rejects missing code", () => {
    const result = createCourseSchema.safeParse({ name: "Intro" });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = createCourseSchema.safeParse({ code: "CS101" });
    expect(result.success).toBe(false);
  });

  it("rejects empty code", () => {
    const result = createCourseSchema.safeParse({ code: "", name: "Test" });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createCourseSchema.safeParse({
      code: "CS101",
      name: "Intro",
      description: "A course",
      learningOutcomes: ["LO1"],
    });
    expect(result.success).toBe(true);
  });
});

describe("courseChatSchema", () => {
  it("accepts valid message", () => {
    const result = courseChatSchema.safeParse({ message: "Hello" });
    expect(result.success).toBe(true);
  });

  it("rejects empty message", () => {
    const result = courseChatSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
  });

  it("accepts with history", () => {
    const result = courseChatSchema.safeParse({
      message: "Hi",
      history: [{ role: "user", content: "prev" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("studyScheduleSchema", () => {
  it("accepts empty body", () => {
    const result = studyScheduleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts examDate", () => {
    const result = studyScheduleSchema.safeParse({ examDate: "2026-04-15" });
    expect(result.success).toBe(true);
  });
});
