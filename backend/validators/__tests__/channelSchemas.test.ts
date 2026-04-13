import { describe, it, expect } from "vitest";
import { createChannelSchema, updateChannelSchema } from "../channelSchemas";

describe("createChannelSchema", () => {
  it("accepts valid text channel", () => {
    const result = createChannelSchema.safeParse({
      categoryId: "cat-1",
      name: "general",
      type: "text",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid announcement channel", () => {
    const result = createChannelSchema.safeParse({
      categoryId: "cat-1",
      name: "news",
      type: "announcement",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid study-tool channel with toolType", () => {
    const result = createChannelSchema.safeParse({
      categoryId: "cat-1",
      name: "quiz-room",
      type: "study-tool",
      toolType: "quiz",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid toolType values", () => {
    const toolTypes = ["quiz", "flashcards", "deep-dive", "mind-map", "sprint", "notes"];
    for (const toolType of toolTypes) {
      const result = createChannelSchema.safeParse({
        categoryId: "cat-1",
        name: "tool-ch",
        type: "study-tool",
        toolType,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects voice type (removed)", () => {
    const result = createChannelSchema.safeParse({
      categoryId: "cat-1",
      name: "voice-room",
      type: "voice",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createChannelSchema.safeParse({
      categoryId: "cat-1",
      name: "ch",
      type: "video",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createChannelSchema.safeParse({
      categoryId: "cat-1",
      name: "",
      type: "text",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = createChannelSchema.safeParse({
      categoryId: "cat-1",
      name: "x".repeat(101),
      type: "text",
    });
    expect(result.success).toBe(false);
  });

  it("accepts name exactly 100 chars", () => {
    const result = createChannelSchema.safeParse({
      categoryId: "cat-1",
      name: "x".repeat(100),
      type: "text",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty categoryId", () => {
    const result = createChannelSchema.safeParse({
      categoryId: "",
      name: "general",
      type: "text",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(createChannelSchema.safeParse({}).success).toBe(false);
    expect(createChannelSchema.safeParse({ name: "ch" }).success).toBe(false);
    expect(createChannelSchema.safeParse({ categoryId: "c1", type: "text" }).success).toBe(false);
  });

  it("accepts optional lessonId and lessonTitle", () => {
    const result = createChannelSchema.safeParse({
      categoryId: "cat-1",
      name: "ch",
      type: "text",
      lessonId: "lesson-1",
      lessonTitle: "Intro",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid toolType", () => {
    const result = createChannelSchema.safeParse({
      categoryId: "cat-1",
      name: "ch",
      type: "study-tool",
      toolType: "invalid-tool",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateChannelSchema", () => {
  it("accepts valid partial update with name", () => {
    const result = updateChannelSchema.safeParse({ name: "new-name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = updateChannelSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts lessonId update", () => {
    const result = updateChannelSchema.safeParse({ lessonId: "l-1" });
    expect(result.success).toBe(true);
  });

  it("accepts lessonTitle update", () => {
    const result = updateChannelSchema.safeParse({ lessonTitle: "New title" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name string", () => {
    const result = updateChannelSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = updateChannelSchema.safeParse({ name: "n".repeat(101) });
    expect(result.success).toBe(false);
  });
});
