import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/env", () => ({
  env: { GEMINI_API_KEY: "test-key" },
}));

// Mock courseController
const mockGetCourse = vi.fn();
const mockGetCourseProgress = vi.fn();

vi.mock("../../services/courseDataService", () => ({
  getCourse: (...args: any[]) => mockGetCourse(...args),
  getCourseProgress: (...args: any[]) => mockGetCourseProgress(...args),
}));

// Mock contextAssembler — called by generateCourseChatResponse
vi.mock("../../controllers/contextAssembler", () => ({
  assembleCourseWideContext: vi.fn(() => ({
    fullContext: "Mocked course context",
  })),
}));

// Mock aiService — getModel is used by chat, safeGenerate by schedule
vi.mock("../aiService", () => ({
  getModel: vi.fn(() => ({
    startChat: vi.fn(() => ({
      sendMessage: vi.fn(async () => ({
        response: {
          text: () => "AI response\n**Suggested Questions:**\n1. What is X?\n2. How does Y?\n3. Why Z?",
        },
      })),
    })),
  })),
  safeGenerate: vi.fn(async () => ({
    response: {
      text: () => JSON.stringify({ days: [], tips: [] }),
    },
  })),
  getTemperature: vi.fn().mockReturnValue(0.3),
  tryParseJSON: vi.fn((text: string) => {
    try { return JSON.parse(text); } catch { return null; }
  }),
  stripCodeFences: vi.fn((text: string) => text.replace(/^```[\s\S]*?\n|```$/g, "").trim()),
}));

// Mock schemas
vi.mock("../../prompts/schemas", () => ({
  SCHEMAS: {
    STUDY_SCHEDULE: {},
  },
}));

import { generateCourseChatResponse, generateStudySchedule } from "../courseAiService";
import { AppError } from "../../middleware/errorHandler";

describe("courseAiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateCourseChatResponse", () => {
    it("throws notFound (404) when course does not exist", async () => {
      mockGetCourse.mockReturnValue(null);

      await expect(
        generateCourseChatResponse("nonexistent", "hello")
      ).rejects.toThrow(AppError);

      await expect(
        generateCourseChatResponse("nonexistent", "hello")
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Course not found",
      });
    });

    it("returns text and suggestions when course exists", async () => {
      mockGetCourse.mockReturnValue({
        id: "course-1",
        code: "CS101",
        name: "Intro to CS",
        lessonIds: [],
      });

      const result = await generateCourseChatResponse("course-1", "Explain recursion");
      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.suggestions).toBeInstanceOf(Array);
    });
  });

  describe("generateStudySchedule", () => {
    it("throws notFound (404) when course does not exist", async () => {
      mockGetCourse.mockReturnValue(null);

      await expect(generateStudySchedule("nonexistent")).rejects.toThrow(AppError);

      await expect(generateStudySchedule("nonexistent")).rejects.toMatchObject({
        statusCode: 404,
        message: "Course not found",
      });
    });

    it("returns schedule with days and tips when course exists", async () => {
      mockGetCourse.mockReturnValue({
        id: "course-2",
        code: "MATH153",
        name: "Calculus II",
        lessonIds: [],
        settings: { examDate: "2026-05-01" },
      });
      mockGetCourseProgress.mockReturnValue({
        totalLessons: 5,
        completedLessons: 3,
        overallQuizAvg: 0.72,
        weakTopics: ["Integration"],
      });

      const result = await generateStudySchedule("course-2", "2026-05-01");
      expect(result.courseId).toBe("course-2");
      expect(result.generatedAt).toBeDefined();
      expect(result.days).toBeInstanceOf(Array);
      expect(result.tips).toBeInstanceOf(Array);
    });
  });
});
