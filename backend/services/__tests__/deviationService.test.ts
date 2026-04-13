import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/env", () => ({
  env: { GEMINI_API_KEY: "test-key", PYTHON_BIN: "python" },
}));

// Mock lessonControllers — provide controllable getLesson and upsertLesson
const mockGetLesson = vi.fn();
const mockUpsertLesson = vi.fn();

vi.mock("../../services/lessonDataService", () => ({
  getLesson: (...args: any[]) => mockGetLesson(...args),
  upsertLesson: (...args: any[]) => mockUpsertLesson(...args),
}));

import { analyzeDeviation } from "../deviationService";
import { AppError } from "../../middleware/errorHandler";

describe("deviationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws notFound (404) when lesson does not exist", async () => {
    mockGetLesson.mockReturnValue(null);

    await expect(analyzeDeviation("nonexistent")).rejects.toThrow(AppError);
    await expect(analyzeDeviation("nonexistent")).rejects.toMatchObject({
      statusCode: 404,
      message: "Lesson not found",
    });
  });

  it("throws badRequest (400) when transcript is missing", async () => {
    mockGetLesson.mockReturnValue({
      id: "lec-1",
      title: "Test",
      transcript: "",
      slideText: "Some slides",
    });

    await expect(analyzeDeviation("lec-1")).rejects.toThrow(AppError);
    await expect(analyzeDeviation("lec-1")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws badRequest (400) when slideText is missing", async () => {
    mockGetLesson.mockReturnValue({
      id: "lec-2",
      title: "Test",
      transcript: "Some transcript",
      slideText: "",
    });

    await expect(analyzeDeviation("lec-2")).rejects.toThrow(AppError);
    await expect(analyzeDeviation("lec-2")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("throws badRequest (400) when both transcript and slideText are whitespace-only", async () => {
    mockGetLesson.mockReturnValue({
      id: "lec-3",
      title: "Test",
      transcript: "   ",
      slideText: "   ",
    });

    await expect(analyzeDeviation("lec-3")).rejects.toThrow(AppError);
    await expect(analyzeDeviation("lec-3")).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("returns cached deviation when available and forceReanalyze is false", async () => {
    const cachedDeviation = {
      segments: [{ type: "match", text: "test" }],
    };
    mockGetLesson.mockReturnValue({
      id: "lec-cached",
      title: "Cached Lesson",
      transcript: "Some transcript",
      slideText: "Some slides",
      deviation: cachedDeviation,
    });

    const result = await analyzeDeviation("lec-cached", false);
    expect(result.cached).toBe(true);
    expect(result.deviation).toBe(cachedDeviation);
  });
});
