import { useEffect, useCallback } from "react";
import { useFlashcardStore } from "../stores/flashcardStore";
import { useLessonStore } from "../stores/lessonStore";

export function useFlashcardPane() {
  const { stats, fetchStats, viewMode, setViewMode, generate, loading } = useFlashcardStore();
  const currentLessonId = useLessonStore((s) => s.currentLessonId);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!currentLessonId) return;
    await generate(currentLessonId);
  }, [currentLessonId, generate]);

  return {
    stats,
    viewMode,
    setViewMode,
    loading,
    currentLessonId,
    handleGenerate,
  };
}
