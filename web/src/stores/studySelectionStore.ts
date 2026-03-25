// src/stores/studySelectionStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StudySelectionState {
  selectedLessonIds: string[];
  isSelectionMode: boolean;
  courseIdForSelection: string | null;

  enterSelectionMode: (courseId: string) => void;
  exitSelectionMode: () => void;
  toggleLesson: (lessonId: string) => void;
  selectAll: (lessonIds: string[]) => void;
  clearAll: () => void;
}

export const useStudySelectionStore = create<StudySelectionState>()(
  persist(
    (set) => ({
      selectedLessonIds: [],
      isSelectionMode: false,
      courseIdForSelection: null,

      enterSelectionMode: (courseId) =>
        set({ isSelectionMode: true, courseIdForSelection: courseId }),

      exitSelectionMode: () =>
        set({ isSelectionMode: false, selectedLessonIds: [], courseIdForSelection: null }),

      toggleLesson: (lessonId) =>
        set((s) => {
          const idx = s.selectedLessonIds.indexOf(lessonId);
          if (idx >= 0) {
            return { selectedLessonIds: s.selectedLessonIds.filter((id) => id !== lessonId) };
          }
          return { selectedLessonIds: [...s.selectedLessonIds, lessonId] };
        }),

      selectAll: (lessonIds) =>
        set({ selectedLessonIds: [...lessonIds] }),

      clearAll: () =>
        set({ selectedLessonIds: [] }),
    }),
    {
      name: "lc-study-selection",
      partialize: (s) => ({
        selectedLessonIds: s.selectedLessonIds,
        isSelectionMode: s.isSelectionMode,
        courseIdForSelection: s.courseIdForSelection,
      }),
    }
  )
);
