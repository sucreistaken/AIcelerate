import { useEffect, useMemo, useRef, useState } from "react";
import { LoStudyModule } from "../types";
import { useLessonStore } from "../stores/lessonStore";
import { exportToPdf } from "../utils/pdfExport";
import { logger } from "../utils/logger";

const STORAGE_KEY_PREFIX = "lc.lostudy.progress.";
const getStorageKey = (lessonId: string) => `${STORAGE_KEY_PREFIX}${lessonId}`;

export function useLoStudy(modules: LoStudyModule[]) {
  const { currentLessonId } = useLessonStore();

  const [activeLoId, setActiveLoId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["core", "remember"])
  );
  const [quizRevealed, setQuizRevealed] = useState<Record<number, boolean>>({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const loContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentLessonId) return;
    const key = getStorageKey(currentLessonId);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCompletedIds(parsed);
        }
      } catch (e) {
        logger.error("Failed to parse LO progress:", e);
      }
    }
  }, [currentLessonId]);

  useEffect(() => {
    if (!currentLessonId) return;
    const key = getStorageKey(currentLessonId);
    localStorage.setItem(key, JSON.stringify(completedIds));
  }, [completedIds, currentLessonId]);

  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);

  useEffect(() => {
    if (!activeLoId && modules.length > 0) {
      setActiveLoId(modules[0].loId);
    }
  }, [modules, activeLoId]);

  const active = modules.find((m) => m.loId === activeLoId) || modules[0] || null;

  const totalCount = modules.length;
  const completedCount = completedIds.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalTime = modules.reduce((sum, m) => sum + (m.recommended_study_time_min || 0), 0);
  const completedTime = modules
    .filter((m) => completedSet.has(m.loId))
    .reduce((sum, m) => sum + (m.recommended_study_time_min || 0), 0);

  const handleExportPdf = async () => {
    if (!loContentRef.current) return;
    setPdfLoading(true);
    try {
      await exportToPdf(loContentRef.current, "LO_Study_Modules");
    } catch (err) {
      logger.error("PDF export error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleToggleComplete = (loId: string) => {
    setCompletedIds((prev) =>
      prev.includes(loId) ? prev.filter((id) => id !== loId) : [...prev, loId]
    );
  };

  const handleSelectModule = (loId: string) => {
    setActiveLoId(loId);
    setQuizRevealed({});
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const toggleQuizAnswer = (index: number) => {
    setQuizRevealed((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return {
    loContentRef,
    active,
    activeLoId,
    completedSet,
    expandedSections,
    quizRevealed,
    pdfLoading,
    progress,
    completedCount,
    totalCount,
    completedTime,
    totalTime,
    handleExportPdf,
    handleToggleComplete,
    handleSelectModule,
    toggleSection,
    toggleQuizAnswer,
  };
}
