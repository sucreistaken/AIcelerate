import { describe, it, expect, beforeEach } from "vitest";
import { useLessonStore } from "../lessonStore";

describe("lessonStore", () => {
  beforeEach(() => {
    useLessonStore.setState({
      lessons: [],
      currentLessonId: null,
      lectureText: "",
      slidesText: "",
      plan: null,
      quiz: [],
      courseCode: "",
      learningOutcomes: [],
      loAlignment: null,
      loModules: null,
      cheatSheet: null,
      deviation: null,
      error: null,
    });
  });

  it("starts with empty state", () => {
    const state = useLessonStore.getState();
    expect(state.lessons).toEqual([]);
    expect(state.currentLessonId).toBeNull();
    expect(state.lectureText).toBe("");
    expect(state.plan).toBeNull();
  });

  it("setLessons updates lesson list", () => {
    const lessons = [{ id: "1", title: "Test", date: "2026-01-01" }];
    useLessonStore.getState().setLessons(lessons);
    expect(useLessonStore.getState().lessons).toHaveLength(1);
    expect(useLessonStore.getState().lessons[0].title).toBe("Test");
  });

  it("setCurrentLessonId updates current lesson", () => {
    useLessonStore.getState().setCurrentLessonId("lesson-1");
    expect(useLessonStore.getState().currentLessonId).toBe("lesson-1");
  });

  it("setLectureText and setSlidesText update text fields", () => {
    useLessonStore.getState().setLectureText("Lecture content");
    useLessonStore.getState().setSlidesText("Slide content");
    expect(useLessonStore.getState().lectureText).toBe("Lecture content");
    expect(useLessonStore.getState().slidesText).toBe("Slide content");
  });

  it("setPlan updates plan", () => {
    const plan = { topic: "Math", modules: [] } as any;
    useLessonStore.getState().setPlan(plan);
    expect(useLessonStore.getState().plan).toEqual(plan);
  });

  it("clearCurrentLesson resets all active lesson data", () => {
    useLessonStore.setState({
      currentLessonId: "x",
      lectureText: "text",
      slidesText: "slides",
      plan: { topic: "test" } as any,
      quiz: ["q1"],
      courseCode: "CS101",
      learningOutcomes: ["LO1"],
    });

    useLessonStore.getState().clearCurrentLesson();

    const state = useLessonStore.getState();
    expect(state.currentLessonId).toBeNull();
    expect(state.lectureText).toBe("");
    expect(state.slidesText).toBe("");
    expect(state.plan).toBeNull();
    expect(state.quiz).toEqual([]);
    expect(state.courseCode).toBe("");
    expect(state.learningOutcomes).toEqual([]);
  });

  it("loadLesson populates state from lesson object", () => {
    useLessonStore.getState().loadLesson({
      id: "lec-123",
      title: "Calculus 1",
      transcript: "Long lecture text",
      slideText: "Slide notes",
      courseCode: "MATH101",
      learningOutcomes: ["LO1", "LO2"],
    });

    const state = useLessonStore.getState();
    expect(state.currentLessonId).toBe("lec-123");
    expect(state.lectureText).toBe("Long lecture text");
    expect(state.slidesText).toBe("Slide notes");
    expect(state.courseCode).toBe("MATH101");
    expect(state.learningOutcomes).toEqual(["LO1", "LO2"]);
  });

  it("loadLesson handles missing fields gracefully", () => {
    useLessonStore.getState().loadLesson({ id: "x" });
    const state = useLessonStore.getState();
    expect(state.lectureText).toBe("");
    expect(state.slidesText).toBe("");
    expect(state.courseCode).toBe("");
  });

  it("setError and clear work", () => {
    useLessonStore.getState().setError("Something went wrong");
    expect(useLessonStore.getState().error).toBe("Something went wrong");

    useLessonStore.getState().setError(null);
    expect(useLessonStore.getState().error).toBeNull();
  });
});
