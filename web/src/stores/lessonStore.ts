// src/stores/lessonStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Plan, CheatSheet, LoAlignment, LoStudyModule, ConfidenceScore } from '../types';
import { quotaSafeLocalStorage } from '../utils/quotaSafeStorage';

export interface Lesson {
  id: string;
  title: string;
  date: string;
  // Heavy fields — present when loaded via lessonsApi.getById or dashboard(lite=false),
  // stripped from persisted list (see partialize below).
  transcript?: string;
  slideText?: string;
  plan?: Plan;
  courseCode?: string;
  courseId?: string;
  learningOutcomes?: string[];
  loAlignment?: LoAlignment;
  loModules?: LoStudyModule[];
  cheatSheet?: CheatSheet;
  // Derived "has content" flags used by list UIs. Set by toLite() so consumers
  // don't need to null-check the heavy fields. Also persisted with the lite
  // list so F5 can render badges without rehydrating full lessons.
  hasTranscript?: boolean;
  hasSlides?: boolean;
  hasPlan?: boolean;
  hasQuiz?: boolean;
  hasCheatSheet?: boolean;
}

/**
 * Persistence-safe projection of a Lesson. Strips heavy AI-generated fields
 * (transcript, slideText, full plan/cheatSheet/lo* blobs) — a lesson can run
 * 50-200KB each when fully loaded; persisting 100+ would blow localStorage.
 * Booleans preserve "has content" semantics so list UIs still render badges.
 */
export type LessonLite = Pick<
  Lesson,
  "id" | "title" | "date" | "courseCode" | "courseId" | "learningOutcomes"
> & {
  hasTranscript: boolean;
  hasSlides: boolean;
  hasPlan: boolean;
  hasQuiz: boolean;
  hasCheatSheet: boolean;
};

export function toLite(lesson: Lesson): LessonLite {
  return {
    id: lesson.id,
    title: lesson.title,
    date: lesson.date,
    courseCode: lesson.courseCode,
    courseId: lesson.courseId,
    learningOutcomes: lesson.learningOutcomes,
    hasTranscript: lesson.hasTranscript ?? !!lesson.transcript,
    hasSlides: lesson.hasSlides ?? !!lesson.slideText,
    hasPlan: lesson.hasPlan ?? !!lesson.plan,
    hasQuiz: lesson.hasQuiz ?? !!lesson.plan?.seed_quiz?.length,
    hasCheatSheet: lesson.hasCheatSheet ?? !!lesson.cheatSheet,
  };
}

interface LessonState {
  // Ders listesi
  lessons: Lesson[];
  currentLessonId: string | null;
  /** True while a background refetch is running (non-blocking for UI). */
  revalidating: boolean;

  // Aktif ders verileri
  lectureText: string;
  slidesText: string;
  plan: Plan | null;
  quiz: string[];

  // LO verileri
  courseCode: string;
  learningOutcomes: string[];
  loAlignment: LoAlignment | null;
  loModules: LoStudyModule[] | null;

  // Cheat Sheet
  cheatSheet: CheatSheet | null;

  // Deviation analizi
  deviation: unknown | null;

  // Confidence scores (OPT-15)
  planConfidence: ConfidenceScore | null;
  cheatSheetConfidence: ConfidenceScore | null;

  // Error state
  error: string | null;

  // Actions
  setLessons: (lessons: Lesson[]) => void;
  setCurrentLessonId: (id: string | null) => void;
  setRevalidating: (v: boolean) => void;
  setLectureText: (text: string) => void;
  setSlidesText: (text: string) => void;
  setPlan: (plan: Plan | null) => void;
  setQuiz: (quiz: string[]) => void;
  setCourseCode: (code: string) => void;
  setLearningOutcomes: (outcomes: string[]) => void;
  setLoAlignment: (alignment: LoAlignment | null) => void;
  setLoModules: (modules: LoStudyModule[] | null) => void;
  setCheatSheet: (sheet: CheatSheet | null) => void;
  setDeviation: (deviation: unknown | null) => void;
  setError: (error: string | null) => void;

  // Bulk actions
  clearCurrentLesson: () => void;
  loadLesson: (lesson: Partial<Lesson>) => void;
  /** Reset to initial state — used on logout. */
  reset: () => void;
}

const initialState = {
  lessons: [] as Lesson[],
  currentLessonId: null as string | null,
  revalidating: false,
  lectureText: '',
  slidesText: '',
  plan: null as Plan | null,
  quiz: [] as string[],
  courseCode: '',
  learningOutcomes: [] as string[],
  loAlignment: null as LoAlignment | null,
  loModules: null as LoStudyModule[] | null,
  cheatSheet: null as CheatSheet | null,
  deviation: null as unknown,
  planConfidence: null as ConfidenceScore | null,
  cheatSheetConfidence: null as ConfidenceScore | null,
  error: null as string | null,
};

export const useLessonStore = create<LessonState>()(
  persist(
    (set) => ({
      ...initialState,

      // Actions
      setLessons: (lessons) => set({ lessons }),
      setCurrentLessonId: (id) => set({ currentLessonId: id }),
      setRevalidating: (v) => set({ revalidating: v }),
      setLectureText: (text) => set({ lectureText: text }),
      setSlidesText: (text) => set({ slidesText: text }),
      setPlan: (plan) => set({ plan }),
      setQuiz: (quiz) => set({ quiz }),
      setCourseCode: (code) => set({ courseCode: code }),
      setLearningOutcomes: (outcomes) => set({ learningOutcomes: outcomes }),
      setLoAlignment: (alignment) => set({ loAlignment: alignment }),
      setLoModules: (modules) => set({ loModules: modules }),
      setCheatSheet: (sheet) => set({ cheatSheet: sheet }),
      setDeviation: (deviation) => set({ deviation }),
      setError: (error) => set({ error }),

      clearCurrentLesson: () =>
        set({
          currentLessonId: null,
          lectureText: '',
          slidesText: '',
          plan: null,
          quiz: [],
          courseCode: '',
          learningOutcomes: [],
          loAlignment: null,
          loModules: null,
          cheatSheet: null,
          deviation: null,
          planConfidence: null,
          cheatSheetConfidence: null,
          error: null,
        }),

      loadLesson: (lesson) =>
        set({
          currentLessonId: lesson.id ?? null,
          lectureText: lesson.transcript ?? '',
          slidesText: lesson.slideText ?? '',
          plan: lesson.plan ?? null,
          courseCode: lesson.courseCode ?? '',
          learningOutcomes: lesson.learningOutcomes ?? [],
          loAlignment: lesson.loAlignment ?? null,
          loModules: Array.isArray(lesson.loModules)
            ? lesson.loModules
            : ((lesson.loModules as unknown as { modules?: LoStudyModule[] })?.modules ?? null),
          cheatSheet: lesson.cheatSheet ?? null,
          planConfidence: (lesson as Lesson & { planConfidence?: ConfidenceScore }).planConfidence ?? null,
          cheatSheetConfidence: (lesson as Lesson & { cheatSheetConfidence?: ConfidenceScore }).cheatSheetConfidence ?? null,
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'learncraft-lesson-storage',
      version: 1,
      storage: createJSONStorage(() => quotaSafeLocalStorage()),
      // Persist only list metadata (lite) + current selection. The active
      // lesson's heavy fields (transcript/plan/etc.) are rehydrated from the
      // network on demand via lessonsApi.getById — they live in memory only.
      partialize: (state) => ({
        currentLessonId: state.currentLessonId,
        lessons: state.lessons.map(toLite),
      }),
    }
  )
);
