import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock env
vi.mock("../../config/env", () => ({
  env: { GEMINI_API_KEY: "test-key" },
}));

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock aiService
const mockGenerateContent = vi.fn();
const mockStartChat = vi.fn();

vi.mock("../aiService", () => ({
  getModel: vi.fn(() => ({
    generateContent: mockGenerateContent,
    startChat: mockStartChat,
  })),
  stripCodeFences: vi.fn((text: string) => {
    return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  }),
  tryParseJSON: vi.fn((text: string) => {
    try { return JSON.parse(text); } catch { return null; }
  }),
}));

// Mock lessonPrompts - store refs so we can assert on them
const mockBuildPlanFromTextPrompt = vi.fn(
  (lec: string, sld: string, code?: string) => `PROMPT:${code || "NA"}|${lec.slice(0, 20)}|${sld.slice(0, 20)}`
);
const mockBuildChatContext = vi.fn((..._args: any[]) => "mocked-chat-context");
const mockBuildChatPrompt = vi.fn((ctx: string, msg: string) => `chat:${msg}`);

vi.mock("../../prompts/lessonPrompts", () => ({
  buildPlanFromTextPrompt: (...args: any[]) => mockBuildPlanFromTextPrompt(...args),
  buildChatContext: (...args: any[]) => mockBuildChatContext(...args),
  buildChatPrompt: (...args: any[]) => mockBuildChatPrompt(...args),
}));

// Mock lessonDigestService
const mockGetDigestOrFallback = vi.fn(() => ({
  context: "Digest content here",
  isDigest: true,
}));

vi.mock("../lessonDigestService", () => ({
  getDigestOrFallback: (...args: any[]) => mockGetDigestOrFallback(...args),
}));

// Mock contextAssembler
vi.mock("../../controllers/contextAssembler", () => ({
  assembleCourseContext: vi.fn(() => ({
    courseName: "Test Course",
    courseBlock: "Course block",
    courseId: "course-1",
    crossLessonBlock: "",
    progressBlock: "",
  })),
}));

// Mock downstream re-exported services
vi.mock("../mindmapAiService", () => ({
  generateMindmap: vi.fn(),
  generateMindmapModule: vi.fn(),
  generateMindmapNodeDetail: vi.fn(),
}));

vi.mock("../quizAiService", () => ({
  generateQuizFromPlan: vi.fn(),
  generateQuizAnswers: vi.fn(),
  evaluateQuizAnswer: vi.fn(),
  evaluateQuizBatch: vi.fn(),
}));

import { generatePlan, buildChatContextForLesson, generateChatResponseSync } from "../lessonAiService";

describe("lessonAiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generatePlan", () => {
    it("returns parsed plan on successful AI response", async () => {
      const planData = {
        topic: "Calculus",
        modules: [{ title: "Limits", topics: ["epsilon-delta"] }],
        emphases: [],
        alignment: { items: [] },
      };
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(planData) },
      });

      const result = await generatePlan("lecture text", "slide text", "MATH101");
      expect(result).toEqual(planData);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("retries on parse failure and succeeds on second attempt", async () => {
      const planData = { topic: "Physics", modules: [], emphases: [] };
      // First call returns unparseable text, second returns valid JSON
      mockGenerateContent
        .mockResolvedValueOnce({ response: { text: () => "not valid json" } })
        .mockResolvedValueOnce({ response: { text: () => JSON.stringify(planData) } });

      const result = await generatePlan("lecture", "slides");
      expect(result).toEqual(planData);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    }, 15000);

    it("throws after 3 failed parse attempts", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => "garbage text" },
      });

      await expect(generatePlan("lec", "sld")).rejects.toThrow("LLM JSON parse error after retries");
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    }, 15000);

    it("throws on AI call failure after retries", async () => {
      mockGenerateContent.mockRejectedValue(new Error("API rate limit"));

      await expect(generatePlan("lec", "sld")).rejects.toThrow("API rate limit");
    }, 15000);

    it("truncates long inputs to 18000 chars", async () => {
      const planData = { topic: "Long", modules: [] };
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(planData) },
      });

      const longLecture = "x".repeat(25000);
      const longSlides = "y".repeat(25000);
      await generatePlan(longLecture, longSlides);

      expect(mockBuildPlanFromTextPrompt).toHaveBeenCalled();
      const firstCallArgs = mockBuildPlanFromTextPrompt.mock.calls[0];
      expect(firstCallArgs[0].length).toBeLessThanOrEqual(18000);
      expect(firstCallArgs[1].length).toBeLessThanOrEqual(18000);
    });

    it("passes learning outcomes to prompt builder", async () => {
      const planData = { topic: "LO Test", modules: [] };
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(planData) },
      });

      await generatePlan("lec", "sld", "CS101", ["Understand X", "Apply Y"]);

      const callArgs = mockBuildPlanFromTextPrompt.mock.calls[0];
      expect(callArgs[2]).toBe("CS101");
      expect(callArgs[3]).toContain("Understand X");
      expect(callArgs[3]).toContain("Apply Y");
    });
  });

  describe("buildChatContextForLesson", () => {
    const mockLesson = {
      id: "lec-1",
      title: "Test Lesson",
      courseCode: "CS101",
      transcript: "Some transcript text",
      slideText: "Some slide text",
      plan: {
        modules: [{ title: "Module 1", topics: ["topic1"] }],
        emphases: [{ statement: "Important", why: "Exam" }],
      },
      professorEmphases: [],
      deviation: null,
      cheatSheet: null,
      loAlignment: null,
    } as any;

    it("returns prompt, history, and courseCtx", () => {
      const result = buildChatContextForLesson(mockLesson, "lec-1", "Hello");
      expect(result.prompt).toBeDefined();
      expect(result.history).toEqual([]);
      expect(result.courseCtx).toBeDefined();
      expect(result.courseCtx.courseId).toBe("course-1");
    });

    it("passes message to prompt builder", () => {
      buildChatContextForLesson(mockLesson, "lec-1", "What is recursion?");
      expect(mockBuildChatPrompt).toHaveBeenCalledWith(
        expect.any(String),
        "What is recursion?",
        "course-1",
      );
    });

    it("includes provided history in return value", () => {
      const history = [
        { role: "user" as const, content: "Hi" },
        { role: "model" as const, content: "Hello!" },
      ];
      const result = buildChatContextForLesson(mockLesson, "lec-1", "Next question", history);
      expect(result.history).toHaveLength(2);
    });

    it("uses buildChatContext for first message (no history)", () => {
      buildChatContextForLesson(mockLesson, "lec-1", "First message");
      expect(mockBuildChatContext).toHaveBeenCalled();
      const callArgs = mockBuildChatContext.mock.calls[0];
      expect(callArgs).toBeDefined();
    });

    it("uses digest for follow-up messages (with history)", () => {
      const history = [{ role: "user" as const, content: "prev" }];
      buildChatContextForLesson(mockLesson, "lec-1", "Follow up", history);
      expect(mockGetDigestOrFallback).toHaveBeenCalledWith("lec-1");
    });
  });

  describe("generateChatResponseSync", () => {
    it("returns text and suggestions from AI", async () => {
      const mockSendMessage = vi.fn().mockResolvedValue({
        response: {
          text: () => "Great question!\n\n\u{1F4A1} **Suggested Questions:**\n1. What is X?\n2. How does Y work?\n3. Why is Z important?",
        },
      });
      mockStartChat.mockReturnValue({ sendMessage: mockSendMessage });

      const result = await generateChatResponseSync("prompt text", []);
      expect(result.text).toContain("Great question!");
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.suggestions.length).toBeLessThanOrEqual(3);
    });

    it("returns empty suggestions when none found", async () => {
      const mockSendMessage = vi.fn().mockResolvedValue({
        response: { text: () => "Just a plain answer with no suggestions." },
      });
      mockStartChat.mockReturnValue({ sendMessage: mockSendMessage });

      const result = await generateChatResponseSync("prompt", []);
      expect(result.text).toBe("Just a plain answer with no suggestions.");
      expect(result.suggestions).toEqual([]);
    });

    it("passes history to startChat", async () => {
      const mockSendMessage = vi.fn().mockResolvedValue({
        response: { text: () => "response" },
      });
      mockStartChat.mockReturnValue({ sendMessage: mockSendMessage });

      const history = [
        { role: "user" as const, content: "Hello" },
        { role: "model" as const, content: "Hi there" },
      ];
      await generateChatResponseSync("new question", history);

      expect(mockStartChat).toHaveBeenCalledWith(
        expect.objectContaining({
          history: expect.arrayContaining([
            expect.objectContaining({ role: "user" }),
            expect.objectContaining({ role: "model" }),
          ]),
        })
      );
    });
  });
});
