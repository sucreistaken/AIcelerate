import { describe, it, expect } from "vitest";
import {
  buildPlanFromTextPrompt,
  buildQuizFromPlanPrompt,
  buildQuizEvalPrompt,
  buildChatContext,
  buildChatPrompt,
  buildMindmapPrompt,
} from "../lessonPrompts";

describe("buildPlanFromTextPrompt", () => {
  it("includes lecture and slide text", () => {
    const prompt = buildPlanFromTextPrompt("Lecture content", "Slide content", undefined, "—");
    expect(prompt).toContain("Lecture content");
    expect(prompt).toContain("Slide content");
  });

  it("includes course code when provided", () => {
    const prompt = buildPlanFromTextPrompt("lec", "sld", "CS101", "—");
    expect(prompt).toContain("CS101");
  });

  it("includes learning outcomes block", () => {
    const loBlock = "1. Understand X\n2. Apply Y";
    const prompt = buildPlanFromTextPrompt("lec", "sld", undefined, loBlock);
    expect(prompt).toContain("Understand X");
    expect(prompt).toContain("Apply Y");
  });

  it("contains JSON schema instructions", () => {
    const prompt = buildPlanFromTextPrompt("lec", "sld", undefined, "—");
    expect(prompt).toContain("ONLY VALID JSON");
    expect(prompt).toContain("modules");
    expect(prompt).toContain("emphases");
  });
});

describe("buildQuizFromPlanPrompt", () => {
  it("includes plan JSON", () => {
    const prompt = buildQuizFromPlanPrompt('{"topic": "Test"}', "");
    expect(prompt).toContain("Test");
  });

  it("includes cross-lesson hint when provided", () => {
    const prompt = buildQuizFromPlanPrompt("{}", "\nRELATED: Lesson 2 covers Y");
    expect(prompt).toContain("RELATED: Lesson 2 covers Y");
  });
});

describe("buildQuizEvalPrompt", () => {
  it("includes context, question, and student answer", () => {
    const prompt = buildQuizEvalPrompt("Context block", "What is X?", "X is Y");
    expect(prompt).toContain("Context block");
    expect(prompt).toContain("What is X?");
    expect(prompt).toContain("X is Y");
  });
});

describe("buildChatContext", () => {
  it("returns string with lesson info", () => {
    const context = buildChatContext(
      "Calculus",
      "MATH 101",
      "Course overview",
      [{ title: "Limits" }],
      [{ statement: "Focus on derivatives" }],
      "", "", "", "",
      "Lesson content block",
      "", ""
    );
    expect(context).toContain("Calculus");
    expect(context).toContain("MATH 101");
    expect(context).toContain("Limits");
  });
});

describe("buildChatPrompt", () => {
  it("wraps context and message", () => {
    const prompt = buildChatPrompt("system context", "user question", undefined);
    expect(prompt).toContain("system context");
    expect(prompt).toContain("user question");
  });
});

describe("buildMindmapPrompt", () => {
  it("includes title and module names", () => {
    const prompt = buildMindmapPrompt(
      "Neural Networks",
      ["Perceptron", "Backprop"],
      ["Gradient descent"],
      ["CNN", "RNN"],
      "transcript excerpt",
      "slide excerpt",
      ""
    );
    expect(prompt).toContain("Neural Networks");
    expect(prompt).toContain("Perceptron");
    expect(prompt).toContain("mindmap");
  });
});
