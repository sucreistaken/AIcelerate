import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLessonWizard } from "../useLessonWizard";

// Mock stores
const mockLessonStore = {
  lectureText: "",
  slidesText: "",
  setCurrentLessonId: vi.fn(),
  setLessons: vi.fn(),
  setSlidesText: vi.fn(),
  setPlan: vi.fn(),
  clearCurrentLesson: vi.fn(),
};

const mockCourseStore = {
  courses: [
    { id: "course-1", code: "CS101", name: "Intro CS", lessonIds: [], learningOutcomes: ["LO1"] },
  ],
  currentCourseId: "course-1",
  selectCourse: vi.fn(),
  fetchCourses: vi.fn().mockResolvedValue(undefined),
  rebuildIndex: vi.fn().mockResolvedValue(undefined),
};

const mockUiStore = {
  mode: "create-lesson" as const,
  setMode: vi.fn(),
};

vi.mock("../../stores/lessonStore", () => ({
  useLessonStore: () => mockLessonStore,
}));

vi.mock("../../stores/courseStore", () => ({
  useCourseStore: () => mockCourseStore,
}));

vi.mock("../../stores/uiStore", () => ({
  useUiStore: () => mockUiStore,
}));

vi.mock("../useTranscription", () => ({
  useTranscription: () => ({
    stt: { progress: 0, status: null, now: null, toast: null },
    startTranscription: vi.fn(),
    clearTranscription: vi.fn(),
    cancelTranscription: vi.fn(),
  }),
}));

vi.mock("../../services/api", () => ({
  lessonsApi: {
    create: vi.fn().mockResolvedValue({ id: "lesson-1", title: "Test Lesson" }),
    getAll: vi.fn().mockResolvedValue([]),
    uploadSlides: vi.fn().mockResolvedValue({ ok: true, text: "Slide text" }),
    delete: vi.fn().mockResolvedValue({ ok: true }),
  },
  planApi: {
    createFromText: vi.fn().mockResolvedValue({ plan: { topic: "Test" } }),
  },
  courseApi: {
    addLesson: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

describe("useLessonWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLessonStore.lectureText = "";
    mockLessonStore.slidesText = "";
  });

  it("initializes with step 1, empty title, and course from store", () => {
    const { result } = renderHook(() => useLessonWizard());
    expect(result.current.step).toBe(1);
    expect(result.current.title).toBe("");
    expect(result.current.weekNumber).toBe("");
    expect(result.current.selectedCourseId).toBe("course-1");
    expect(result.current.lessonId).toBeNull();
    expect(result.current.isCreating).toBe(false);
    expect(result.current.analysisCompleted).toBe(false);
  });

  it("setTitle updates the title", () => {
    const { result } = renderHook(() => useLessonWizard());
    act(() => { result.current.setTitle("New Lesson"); });
    expect(result.current.title).toBe("New Lesson");
  });

  it("setWeekNumber updates the week number", () => {
    const { result } = renderHook(() => useLessonWizard());
    act(() => { result.current.setWeekNumber("5"); });
    expect(result.current.weekNumber).toBe("5");
  });

  it("canProceed is false on step 1 when title is empty", () => {
    const { result } = renderHook(() => useLessonWizard());
    expect(result.current.canProceed).toBe(false);
  });

  it("canProceed is true on step 1 when title and courseId are set", () => {
    const { result } = renderHook(() => useLessonWizard());
    act(() => { result.current.setTitle("Calculus"); });
    expect(result.current.canProceed).toBe(true);
  });

  it("canProceed is false on step 1 without a selected course", () => {
    const { result } = renderHook(() => useLessonWizard());
    act(() => {
      result.current.setTitle("Calculus");
      result.current.setSelectedCourseId(null);
    });
    expect(result.current.canProceed).toBe(false);
  });

  it("canProceed is true on steps 2 and 3 (optional content)", () => {
    const { result } = renderHook(() => useLessonWizard());
    act(() => { result.current.setStep(2); });
    expect(result.current.canProceed).toBe(true);
    act(() => { result.current.setStep(3); });
    expect(result.current.canProceed).toBe(true);
  });

  it("canProceed on step 4 requires slides or lecture text", () => {
    const { result } = renderHook(() => useLessonWizard());
    act(() => { result.current.setStep(4); });
    expect(result.current.canProceed).toBe(false);

    act(() => { result.current.setSlidesText("Some slide content"); });
    expect(result.current.canProceed).toBe(true);
  });

  it("nextStep advances from step 1 to 2, prevStep goes back", () => {
    const { result } = renderHook(() => useLessonWizard());
    act(() => { result.current.nextStep(); });
    expect(result.current.step).toBe(2);
    act(() => { result.current.nextStep(); });
    expect(result.current.step).toBe(3);
    act(() => { result.current.prevStep(); });
    expect(result.current.step).toBe(2);
  });

  it("nextStep does not go beyond step 4", () => {
    const { result } = renderHook(() => useLessonWizard());
    act(() => { result.current.setStep(4); });
    act(() => { result.current.nextStep(); });
    expect(result.current.step).toBe(4);
  });

  it("prevStep does not go below step 1", () => {
    const { result } = renderHook(() => useLessonWizard());
    act(() => { result.current.prevStep(); });
    expect(result.current.step).toBe(1);
  });
});
