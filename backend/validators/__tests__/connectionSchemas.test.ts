import { describe, it, expect } from "vitest";
import { connectionDeepDiveSchema } from "../connectionSchemas";

describe("connectionDeepDiveSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = connectionDeepDiveSchema.safeParse({
      concept: "Recursion",
      lessonTitles: ["Lesson 1", "Lesson 2"],
      relatedConcepts: ["Iteration", "Stack"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.concept).toBe("Recursion");
      expect(result.data.lessonTitles).toEqual(["Lesson 1", "Lesson 2"]);
      expect(result.data.relatedConcepts).toEqual(["Iteration", "Stack"]);
    }
  });

  it("accepts input with only concept (arrays default to empty)", () => {
    const result = connectionDeepDiveSchema.safeParse({
      concept: "Linked Lists",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.concept).toBe("Linked Lists");
      expect(result.data.lessonTitles).toEqual([]);
      expect(result.data.relatedConcepts).toEqual([]);
    }
  });

  it("rejects missing concept", () => {
    const result = connectionDeepDiveSchema.safeParse({
      lessonTitles: ["Lesson 1"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty concept string", () => {
    const result = connectionDeepDiveSchema.safeParse({
      concept: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const conceptError = result.error.issues.find((i) => i.path.includes("concept"));
      expect(conceptError).toBeDefined();
    }
  });

  it("rejects non-string concept", () => {
    const result = connectionDeepDiveSchema.safeParse({
      concept: 123,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-array lessonTitles", () => {
    const result = connectionDeepDiveSchema.safeParse({
      concept: "Test",
      lessonTitles: "not an array",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-array relatedConcepts", () => {
    const result = connectionDeepDiveSchema.safeParse({
      concept: "Test",
      relatedConcepts: 42,
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty arrays for optional fields", () => {
    const result = connectionDeepDiveSchema.safeParse({
      concept: "Polymorphism",
      lessonTitles: [],
      relatedConcepts: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects completely empty object", () => {
    const result = connectionDeepDiveSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects null input", () => {
    const result = connectionDeepDiveSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});
