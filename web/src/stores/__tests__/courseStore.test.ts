import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCourseStore } from "../courseStore";

// Mock courseApi via the barrel re-export path used by the store
vi.mock("../../services/api", () => ({
  courseApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addLesson: vi.fn(),
    removeLesson: vi.fn(),
    rebuildIndex: vi.fn(),
    getProgress: vi.fn(),
    generateSchedule: vi.fn(),
    exportCourse: vi.fn(),
  },
}));

// Also mock react-hot-toast (used by removeLessonFromCourse)
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { courseApi } from "../../services/api";

const mockedCourseApi = courseApi as unknown as {
  [K in keyof typeof courseApi]: ReturnType<typeof vi.fn>;
};

const makeCourse = (overrides: Partial<any> = {}) => ({
  id: "c1",
  code: "CS101",
  name: "Intro to CS",
  description: "",
  lessonIds: [],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});

const initialState = {
  courses: [],
  currentCourseId: null,
  loading: false,
  revalidating: false,
  error: null,
  courseProgress: null,
  weeklySchedule: null,
  progressLoading: false,
  scheduleLoading: false,
};

describe("courseStore", () => {
  beforeEach(() => {
    useCourseStore.setState(initialState);
    vi.clearAllMocks();
  });

  // ---- Initial state ----
  it("starts with empty state", () => {
    const state = useCourseStore.getState();
    expect(state.courses).toEqual([]);
    expect(state.currentCourseId).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  // ---- fetchCourses ----
  it("fetchCourses populates courses on success", async () => {
    const courses = [makeCourse(), makeCourse({ id: "c2", code: "MATH201" })];
    mockedCourseApi.getAll.mockResolvedValue({ ok: true, courses });

    await useCourseStore.getState().fetchCourses();

    const state = useCourseStore.getState();
    expect(state.courses).toHaveLength(2);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("fetchCourses sets error on failure response", async () => {
    mockedCourseApi.getAll.mockResolvedValue({ ok: false, error: "Server error" });

    await useCourseStore.getState().fetchCourses();

    expect(useCourseStore.getState().error).toBe("Server error");
    expect(useCourseStore.getState().loading).toBe(false);
  });

  it("fetchCourses sets error on network exception", async () => {
    mockedCourseApi.getAll.mockRejectedValue(new Error("Network failure"));

    await useCourseStore.getState().fetchCourses();

    expect(useCourseStore.getState().error).toBe("Network failure");
    expect(useCourseStore.getState().loading).toBe(false);
  });

  // ---- createCourse ----
  it("createCourse adds course and sets it as current", async () => {
    const course = makeCourse();
    mockedCourseApi.create.mockResolvedValue({ ok: true, course });

    const result = await useCourseStore.getState().createCourse("CS101", "Intro to CS");

    expect(result).toEqual(course);
    expect(useCourseStore.getState().courses).toHaveLength(1);
    expect(useCourseStore.getState().currentCourseId).toBe("c1");
    expect(useCourseStore.getState().loading).toBe(false);
  });

  it("createCourse returns null on API failure", async () => {
    mockedCourseApi.create.mockResolvedValue({ ok: false, error: "Duplicate code" });

    const result = await useCourseStore.getState().createCourse("CS101", "Intro");

    expect(result).toBeNull();
    expect(useCourseStore.getState().courses).toHaveLength(0);
    expect(useCourseStore.getState().error).toBe("Duplicate code");
  });

  // ---- deleteCourse ----
  it("deleteCourse removes course from list", async () => {
    const course = makeCourse();
    useCourseStore.setState({ courses: [course], currentCourseId: "c1" });
    mockedCourseApi.delete.mockResolvedValue({ ok: true });

    const result = await useCourseStore.getState().deleteCourse("c1");

    expect(result).toBe(true);
    expect(useCourseStore.getState().courses).toHaveLength(0);
    expect(useCourseStore.getState().currentCourseId).toBeNull();
  });

  it("deleteCourse preserves currentCourseId when deleting a different course", async () => {
    useCourseStore.setState({
      courses: [makeCourse({ id: "c1" }), makeCourse({ id: "c2" })],
      currentCourseId: "c1",
    });
    mockedCourseApi.delete.mockResolvedValue({ ok: true });

    await useCourseStore.getState().deleteCourse("c2");

    expect(useCourseStore.getState().currentCourseId).toBe("c1");
    expect(useCourseStore.getState().courses).toHaveLength(1);
  });

  it("deleteCourse returns false on failure", async () => {
    useCourseStore.setState({ courses: [makeCourse()] });
    mockedCourseApi.delete.mockResolvedValue({ ok: false });

    const result = await useCourseStore.getState().deleteCourse("c1");

    expect(result).toBe(false);
    expect(useCourseStore.getState().courses).toHaveLength(1);
  });

  // ---- selectCourse ----
  it("selectCourse sets currentCourseId and resets progress/schedule", () => {
    useCourseStore.setState({
      courseProgress: { courseId: "c1" } as any,
      weeklySchedule: { courseId: "c1" } as any,
    });

    useCourseStore.getState().selectCourse("c2");

    const state = useCourseStore.getState();
    expect(state.currentCourseId).toBe("c2");
    expect(state.courseProgress).toBeNull();
    expect(state.weeklySchedule).toBeNull();
  });

  it("selectCourse with null clears current course", () => {
    useCourseStore.setState({ currentCourseId: "c1" });

    useCourseStore.getState().selectCourse(null);

    expect(useCourseStore.getState().currentCourseId).toBeNull();
  });

  // ---- addLessonToCourse ----
  it("addLessonToCourse updates the course in state", async () => {
    const original = makeCourse({ lessonIds: [] });
    const updated = { ...original, lessonIds: ["L1"] };
    useCourseStore.setState({ courses: [original] });
    mockedCourseApi.addLesson.mockResolvedValue({ ok: true, course: updated });

    await useCourseStore.getState().addLessonToCourse("c1", "L1");

    expect(useCourseStore.getState().courses[0].lessonIds).toContain("L1");
  });

  // ---- removeLessonFromCourse ----
  it("removeLessonFromCourse removes lesson from course", async () => {
    const original = makeCourse({ lessonIds: ["L1", "L2"] });
    const updated = { ...original, lessonIds: ["L2"] };
    useCourseStore.setState({ courses: [original] });
    mockedCourseApi.removeLesson.mockResolvedValue({ ok: true, course: updated });

    await useCourseStore.getState().removeLessonFromCourse("c1", "L1");

    expect(useCourseStore.getState().courses[0].lessonIds).toEqual(["L2"]);
  });

  // ---- getCourseForCurrentLesson ----
  it("getCourseForCurrentLesson finds course containing the lesson", () => {
    const course = makeCourse({ lessonIds: ["L1", "L2"] });
    useCourseStore.setState({ courses: [course] });

    const found = useCourseStore.getState().getCourseForCurrentLesson("L1");

    expect(found).toEqual(course);
  });

  it("getCourseForCurrentLesson returns null if lesson not found", () => {
    useCourseStore.setState({ courses: [makeCourse({ lessonIds: [] })] });

    const found = useCourseStore.getState().getCourseForCurrentLesson("nonexistent");

    expect(found).toBeNull();
  });

  // ---- fetchCourseProgress ----
  it("fetchCourseProgress sets progress on success", async () => {
    const progress = { courseId: "c1", totalLessons: 5, completedLessons: 3 } as any;
    mockedCourseApi.getProgress.mockResolvedValue({ ok: true, progress });

    await useCourseStore.getState().fetchCourseProgress("c1");

    expect(useCourseStore.getState().courseProgress).toEqual(progress);
    expect(useCourseStore.getState().progressLoading).toBe(false);
  });

  it("fetchCourseProgress clears loading on failure", async () => {
    mockedCourseApi.getProgress.mockRejectedValue(new Error("fail"));

    await useCourseStore.getState().fetchCourseProgress("c1");

    expect(useCourseStore.getState().progressLoading).toBe(false);
  });

  // ---- setRevalidating ----
  it("setRevalidating toggles the revalidating flag", () => {
    expect(useCourseStore.getState().revalidating).toBe(false);
    useCourseStore.getState().setRevalidating(true);
    expect(useCourseStore.getState().revalidating).toBe(true);
    useCourseStore.getState().setRevalidating(false);
    expect(useCourseStore.getState().revalidating).toBe(false);
  });

  // ---- reset ----
  it("reset() returns the store to initial state", () => {
    useCourseStore.setState({
      courses: [makeCourse(), makeCourse({ id: "c2" })],
      currentCourseId: "c1",
      loading: true,
      revalidating: true,
      error: "something",
      courseProgress: { courseId: "c1" } as any,
      weeklySchedule: { courseId: "c1" } as any,
      progressLoading: true,
      scheduleLoading: true,
    });

    useCourseStore.getState().reset();

    const s = useCourseStore.getState();
    expect(s.courses).toEqual([]);
    expect(s.currentCourseId).toBeNull();
    expect(s.loading).toBe(false);
    expect(s.revalidating).toBe(false);
    expect(s.error).toBeNull();
    expect(s.courseProgress).toBeNull();
    expect(s.weeklySchedule).toBeNull();
    expect(s.progressLoading).toBe(false);
    expect(s.scheduleLoading).toBe(false);
  });
});
