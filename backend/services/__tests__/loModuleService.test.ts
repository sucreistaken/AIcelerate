import { describe, it, expect, vi } from "vitest";

vi.mock("../../config/env", () => ({
  env: { GEMINI_API_KEY: "test-key" },
}));

import { buildCondensedContext, segmentTranscript, hasAlignment } from "../loModuleService";

describe("buildCondensedContext", () => {
  it("returns raw transcript/slides when no plan", () => {
    const lesson = { transcript: "Hello world", slideText: "Slide content" };
    const { lecContext, sldContext } = buildCondensedContext(lesson);
    expect(lecContext).toContain("Hello world");
    expect(sldContext).toContain("Slide content");
  });

  it("builds condensed context from plan", () => {
    const lesson = {
      transcript: "Long transcript here",
      slideText: "Slides text",
      plan: {
        topic: "Machine Learning",
        key_concepts: ["Neural Networks", "Backprop"],
        modules: [{ title: "Intro", goal: "Learn basics" }],
        emphases: [{ statement: "Focus on gradients", why: "Core concept" }],
      },
    };
    const { lecContext, sldContext } = buildCondensedContext(lesson);
    expect(lecContext).toContain("Machine Learning");
    expect(lecContext).toContain("Neural Networks");
    expect(lecContext).toContain("Intro");
    expect(lecContext).toContain("Focus on gradients");
    expect(sldContext).toContain("Slides text");
  });

  it("handles empty plan gracefully", () => {
    const lesson = { transcript: "text", slideText: "slides", plan: {} };
    const { lecContext } = buildCondensedContext(lesson);
    expect(lecContext).toContain("text");
  });

  it("truncates long transcripts", () => {
    const longText = "a".repeat(20000);
    const lesson = { transcript: longText, slideText: "" };
    const { lecContext } = buildCondensedContext(lesson);
    expect(lecContext.length).toBeLessThan(20000);
  });
});

describe("segmentTranscript", () => {
  it("splits by double newline", () => {
    const text = "Paragraph 1\n\nParagraph 2\n\nParagraph 3";
    const segments = segmentTranscript(text);
    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe("Paragraph 1");
    expect(segments[1].text).toBe("Paragraph 2");
    expect(segments[2].index).toBe(2);
  });

  it("returns single segment for no breaks", () => {
    const text = "One long paragraph";
    const segments = segmentTranscript(text);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("One long paragraph");
  });

  it("handles empty string", () => {
    const segments = segmentTranscript("");
    expect(segments).toHaveLength(1);
  });

  it("merges segments when over MAX_SEGMENTS (40)", () => {
    const parts = Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1}`);
    const text = parts.join("\n\n");
    const segments = segmentTranscript(text);
    expect(segments.length).toBeLessThanOrEqual(40);
  });

  it("normalizes CRLF to LF", () => {
    const text = "Para 1\r\n\r\nPara 2";
    const segments = segmentTranscript(text);
    expect(segments).toHaveLength(2);
  });
});

describe("hasAlignment", () => {
  it("returns true for valid alignment", () => {
    const plan = {
      alignment: {
        items: [{ topic: "test" }],
        average_duration_min: 5.0,
      },
    };
    expect(hasAlignment(plan)).toBe(true);
  });

  it("returns false when items empty", () => {
    const plan = { alignment: { items: [], average_duration_min: 5 } };
    expect(hasAlignment(plan)).toBe(false);
  });

  it("returns false when average_duration_min is missing", () => {
    const plan = { alignment: { items: [{ topic: "a" }] } };
    expect(hasAlignment(plan)).toBe(false);
  });

  it("returns false when no alignment", () => {
    expect(hasAlignment({})).toBe(false);
    expect(hasAlignment(null)).toBe(false);
    expect(hasAlignment(undefined)).toBe(false);
  });

  it("returns false when average_duration_min is NaN", () => {
    const plan = { alignment: { items: [{ topic: "a" }], average_duration_min: NaN } };
    expect(hasAlignment(plan)).toBe(false);
  });
});
