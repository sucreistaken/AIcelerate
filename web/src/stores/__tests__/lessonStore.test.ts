import { describe, it, expect, beforeEach } from "vitest";
import { useLessonStore, toLite, type Lesson } from "../lessonStore";

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

  it("setRevalidating toggles the revalidating flag", () => {
    expect(useLessonStore.getState().revalidating).toBe(false);
    useLessonStore.getState().setRevalidating(true);
    expect(useLessonStore.getState().revalidating).toBe(true);
    useLessonStore.getState().setRevalidating(false);
    expect(useLessonStore.getState().revalidating).toBe(false);
  });

  it("reset() returns the store to its initial state", () => {
    useLessonStore.setState({
      lessons: [{ id: "1", title: "X", date: "d" }],
      currentLessonId: "1",
      lectureText: "lecture",
      slidesText: "slides",
      plan: { topic: "t" } as unknown as Lesson["plan"],
      quiz: ["q"],
      error: "err",
      revalidating: true,
    });

    useLessonStore.getState().reset();

    const s = useLessonStore.getState();
    expect(s.lessons).toEqual([]);
    expect(s.currentLessonId).toBeNull();
    expect(s.lectureText).toBe("");
    expect(s.slidesText).toBe("");
    expect(s.plan).toBeNull();
    expect(s.quiz).toEqual([]);
    expect(s.error).toBeNull();
    expect(s.revalidating).toBe(false);
  });

  describe("toLite()", () => {
    it("derives boolean flags from heavy fields", () => {
      const full: Lesson = {
        id: "l1",
        title: "Lecture 1",
        date: "2026-04-15",
        transcript: "long text",
        slideText: "slide text",
        plan: { topic: "t", seed_quiz: ["q1", "q2"] } as unknown as Lesson["plan"],
        cheatSheet: { summary: "s" } as unknown as Lesson["cheatSheet"],
        courseCode: "MATH101",
        courseId: "c1",
        learningOutcomes: ["LO1"],
      };

      const lite = toLite(full);

      expect(lite).toEqual({
        id: "l1",
        title: "Lecture 1",
        date: "2026-04-15",
        courseCode: "MATH101",
        courseId: "c1",
        learningOutcomes: ["LO1"],
        hasTranscript: true,
        hasSlides: true,
        hasPlan: true,
        hasQuiz: true,
        hasCheatSheet: true,
      });
    });

    it("yields false flags for an empty lesson", () => {
      const lite = toLite({ id: "l1", title: "Empty", date: "2026-04-15" });
      expect(lite.hasTranscript).toBe(false);
      expect(lite.hasSlides).toBe(false);
      expect(lite.hasPlan).toBe(false);
      expect(lite.hasQuiz).toBe(false);
      expect(lite.hasCheatSheet).toBe(false);
    });

    it("preserves explicit boolean flags from a rehydrated lite lesson", () => {
      // A lite-shaped lesson coming back from localStorage has no heavy
      // fields, only booleans. toLite must not clobber the explicit flags.
      const alreadyLite: Lesson = {
        id: "l1",
        title: "x",
        date: "d",
        hasTranscript: true,
        hasSlides: false,
        hasPlan: true,
        hasQuiz: false,
        hasCheatSheet: false,
      };

      expect(toLite(alreadyLite)).toMatchObject({
        hasTranscript: true,
        hasSlides: false,
        hasPlan: true,
        hasQuiz: false,
        hasCheatSheet: false,
      });
    });

    it("recognises hasQuiz via plan.seed_quiz length", () => {
      expect(toLite({
        id: "l", title: "t", date: "d",
        plan: { topic: "t", seed_quiz: [] } as unknown as Lesson["plan"],
      }).hasQuiz).toBe(false);
      expect(toLite({
        id: "l", title: "t", date: "d",
        plan: { topic: "t", seed_quiz: ["q"] } as unknown as Lesson["plan"],
      }).hasQuiz).toBe(true);
    });
  });
});
