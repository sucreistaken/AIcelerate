import { describe, it, expect, vi } from "vitest";

vi.mock("../../config/env", () => ({
  env: { GEMINI_API_KEY: "test-key" },
}));

import { buildCheatSheetPrompt } from "../cheatSheetService";

describe("buildCheatSheetPrompt", () => {
  it("includes lesson title in prompt", () => {
    const prompt = buildCheatSheetPrompt({
      title: "Calculus 101",
      transcript: "Some lecture text",
      slideText: "Some slide text",
    });
    expect(prompt).toContain("Calculus 101");
  });

  it("includes Turkish language directive when language is tr", () => {
    const prompt = buildCheatSheetPrompt({
      title: "Test",
      transcript: "text",
      slideText: "slides",
      language: "tr",
    });
    expect(prompt).toContain("TÜRKÇE");
  });

  it("includes English language directive when language is en", () => {
    const prompt = buildCheatSheetPrompt({
      title: "Test",
      transcript: "text",
      slideText: "slides",
      language: "en",
    });
    expect(prompt).toContain("ENGLISH");
  });

  it("includes learning outcomes when provided", () => {
    const prompt = buildCheatSheetPrompt({
      title: "Test",
      transcript: "text",
      slideText: "slides",
      learningOutcomes: ["Understand X", "Apply Y"],
    });
    expect(prompt).toContain("LO1: Understand X");
    expect(prompt).toContain("LO2: Apply Y");
  });

  it("truncates long transcripts", () => {
    const longText = "a".repeat(25000);
    const prompt = buildCheatSheetPrompt({
      title: "Test",
      transcript: longText,
      slideText: "slides",
    });
    // Should be truncated to 18000 chars for transcript
    expect(prompt.length).toBeLessThan(25000);
  });

  it("includes JSON schema instructions", () => {
    const prompt = buildCheatSheetPrompt({
      title: "Test",
      transcript: "text",
      slideText: "slides",
    });
    expect(prompt).toContain('"sections"');
    expect(prompt).toContain('"formulas"');
    expect(prompt).toContain('"pitfalls"');
    expect(prompt).toContain('"quickQuiz"');
  });

  it("includes emphases when provided", () => {
    const prompt = buildCheatSheetPrompt({
      title: "Test",
      transcript: "text",
      slideText: "slides",
      emphases: [{ statement: "This is important", why: "Exam material" }],
    });
    expect(prompt).toContain("This is important");
  });
});
