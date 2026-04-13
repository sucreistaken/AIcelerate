import { describe, it, expect } from "vitest";
import { transcribeStartSchema, slidesUploadSchema } from "../uploadSchemas";

describe("transcribeStartSchema", () => {
  it("accepts empty object (lessonId optional)", () => {
    const result = transcribeStartSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts with lessonId", () => {
    const result = transcribeStartSchema.safeParse({ lessonId: "lesson-1" });
    expect(result.success).toBe(true);
  });

  it("accepts lessonId as empty string (optional, no min)", () => {
    const result = transcribeStartSchema.safeParse({ lessonId: "" });
    expect(result.success).toBe(true);
  });
});

describe("slidesUploadSchema", () => {
  it("accepts valid lessonId", () => {
    const result = slidesUploadSchema.safeParse({ lessonId: "lesson-42" });
    expect(result.success).toBe(true);
  });

  it("rejects empty lessonId", () => {
    const result = slidesUploadSchema.safeParse({ lessonId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing lessonId", () => {
    const result = slidesUploadSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
