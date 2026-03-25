import { describe, it, expect } from "vitest";
import {
  planFromTextSchema, cheatSheetSchema, chatSchema,
  mindmapNodeDetailSchema, progressSchema,
} from "../lessonSchemas";

describe("planFromTextSchema", () => {
  it("accepts valid input", () => {
    const result = planFromTextSchema.safeParse({
      lectureText: "Some lecture",
      slidesText: "Some slides",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty lectureText", () => {
    const result = planFromTextSchema.safeParse({
      lectureText: "",
      slidesText: "slides",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing slidesText", () => {
    const result = planFromTextSchema.safeParse({
      lectureText: "lecture",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = planFromTextSchema.safeParse({
      lectureText: "lecture",
      slidesText: "slides",
      lessonId: "abc",
      courseCode: "CS101",
      learningOutcomes: ["LO1", "LO2"],
    });
    expect(result.success).toBe(true);
  });
});

describe("cheatSheetSchema", () => {
  it("defaults language to tr", () => {
    const result = cheatSheetSchema.parse({});
    expect(result.language).toBe("tr");
    expect(result.courseWide).toBe(false);
  });

  it("accepts en language", () => {
    const result = cheatSheetSchema.parse({ language: "en" });
    expect(result.language).toBe("en");
  });

  it("rejects invalid language", () => {
    const result = cheatSheetSchema.safeParse({ language: "fr" });
    expect(result.success).toBe(false);
  });
});

describe("chatSchema", () => {
  it("accepts valid chat input", () => {
    const result = chatSchema.safeParse({
      message: "Hello",
      history: [{ role: "user", content: "Hi" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty message", () => {
    const result = chatSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
  });

  it("accepts without history", () => {
    const result = chatSchema.safeParse({ message: "Hello" });
    expect(result.success).toBe(true);
  });
});

describe("mindmapNodeDetailSchema", () => {
  it("accepts valid input", () => {
    const result = mindmapNodeDetailSchema.safeParse({
      nodeName: "Binary Trees",
      action: "explain",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = mindmapNodeDetailSchema.safeParse({
      nodeName: "test",
      action: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty nodeName", () => {
    const result = mindmapNodeDetailSchema.safeParse({
      nodeName: "",
      action: "quiz",
    });
    expect(result.success).toBe(false);
  });
});

describe("progressSchema", () => {
  it("accepts valid progress", () => {
    const result = progressSchema.safeParse({ lastMode: "quiz", percent: 50 });
    expect(result.success).toBe(true);
  });

  it("rejects percent over 100", () => {
    const result = progressSchema.safeParse({ percent: 150 });
    expect(result.success).toBe(false);
  });

  it("accepts empty body", () => {
    const result = progressSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
