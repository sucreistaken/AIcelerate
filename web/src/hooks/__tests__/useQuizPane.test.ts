import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQuizPane } from "../useQuizPane";

// Mock stores
vi.mock("../../stores/lessonStore", () => ({
  useLessonStore: () => ({ currentLessonId: "lesson-1" }),
}));

const mockSetMode = vi.fn();
vi.mock("../../stores/uiStore", () => ({
  useUiStore: (selector: any) => selector({ setMode: mockSetMode }),
}));

vi.mock("../../stores/gamificationStore", () => ({
  useGamificationStore: Object.assign(
    () => ({ addXp: vi.fn() }),
    { getState: () => ({ addXp: vi.fn() }) },
  ),
}));

// Mock pdfExport
vi.mock("../../utils/pdfExport", () => ({
  exportToPdf: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock apiRetry to just execute the fn directly
vi.mock("../../utils/apiRetry", () => ({
  withRetry: (fn: () => Promise<any>) => fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useQuizPane", () => {
  const mockQuiz = ["[Easy] What is 2+2?", "[Medium] Explain polymorphism", "[Hard] Derive the formula"];
  const mockSetQuiz = vi.fn();
  const mockPlan = { topic: "Test", modules: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockFetch.mockReset();
  });

  it("initializes with empty answers and evalResults", () => {
    const { result } = renderHook(() =>
      useQuizPane(mockQuiz, mockSetQuiz, true, mockPlan as any)
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.loadingAns).toBe(false);
    expect(result.current.evaluating).toBe(false);
    expect(result.current.showDashboard).toBe(false);
    expect(result.current.userAnswers).toEqual({});
  });

  it("exposes setMode from uiStore", () => {
    const { result } = renderHook(() =>
      useQuizPane(mockQuiz, mockSetQuiz, true, mockPlan as any)
    );
    expect(result.current.setMode).toBe(mockSetMode);
  });

  it("setUserAnswers updates user answers", () => {
    const { result } = renderHook(() =>
      useQuizPane(mockQuiz, mockSetQuiz, true, mockPlan as any)
    );
    act(() => { result.current.setUserAnswers({ 0: "Four" }); });
    expect(result.current.userAnswers).toEqual({ 0: "Four" });
  });

  it("generateQuizFromPlan calls API and resets state on success", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ ok: true, questions: ["Q1", "Q2", "Q3"] }),
    });
    const { result } = renderHook(() =>
      useQuizPane(mockQuiz, mockSetQuiz, true, mockPlan as any)
    );
    await act(async () => { await result.current.generateQuizFromPlan(); });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockSetQuiz).toHaveBeenCalledWith(["Q1", "Q2", "Q3"]);
    expect(result.current.loading).toBe(false);
  });

  it("generateQuizFromPlan does nothing without a plan", async () => {
    const { result } = renderHook(() =>
      useQuizPane(mockQuiz, mockSetQuiz, true, null)
    );
    await act(async () => { await result.current.generateQuizFromPlan(); });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetchAnswers calls API and populates answers map", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ ok: true, answers: ["A1", "A2", "A3"] }),
    });
    const { result } = renderHook(() =>
      useQuizPane(mockQuiz, mockSetQuiz, true, mockPlan as any)
    );
    await act(async () => { await result.current.fetchAnswers(); });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.answers).toEqual({ 0: "A1", 1: "A2", 2: "A3" });
  });

  it("evaluateAnswers requires at least one answered question", async () => {
    const toast = await import("react-hot-toast");
    const { result } = renderHook(() =>
      useQuizPane(mockQuiz, mockSetQuiz, true, mockPlan as any)
    );
    // userAnswers is empty, so evaluateAnswers should toast error
    await act(async () => { await result.current.evaluateAnswers(); });
    expect(toast.default.error).toHaveBeenCalledWith("Lutfen en az bir soruyu cevaplayin.");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("evaluateAnswers calls API and sets eval results on success", async () => {
    const evalResults = [
      { index: 0, grade: "correct", feedback: "Good", missing_points: [], confidence: 0.9 },
    ];
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ ok: true, results: evalResults }),
    });
    const { result } = renderHook(() =>
      useQuizPane(mockQuiz, mockSetQuiz, true, mockPlan as any)
    );
    act(() => { result.current.setUserAnswers({ 0: "Four" }); });
    await act(async () => { await result.current.evaluateAnswers(); });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.evalResults).toEqual({ 0: evalResults[0] });
    expect(result.current.showDashboard).toBe(true);
    expect(result.current.evaluating).toBe(false);
  });

  it("dashboardStats computes correctly from evalResults", async () => {
    const evalResults = [
      { index: 0, grade: "correct", feedback: "Good", missing_points: [], confidence: 0.9 },
      { index: 1, grade: "partial", feedback: "OK", missing_points: ["point A"], confidence: 0.6 },
    ];
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ ok: true, results: evalResults }),
    });
    const { result } = renderHook(() =>
      useQuizPane(mockQuiz, mockSetQuiz, true, mockPlan as any)
    );
    act(() => { result.current.setUserAnswers({ 0: "Four", 1: "Something" }); });
    await act(async () => { await result.current.evaluateAnswers(); });
    expect(result.current.dashboardStats).not.toBeNull();
    expect(result.current.dashboardStats!.total).toBe(2);
    expect(result.current.dashboardStats!.correct).toBe(1);
    expect(result.current.dashboardStats!.partial).toBe(1);
    expect(result.current.dashboardStats!.score).toBe(75);
  });
});
