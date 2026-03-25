import React, { useEffect, useMemo, useState } from "react";
import { useUiStore } from "../stores/uiStore";
import { useCourseStore } from "../stores/courseStore";
import { useAuthStore } from "../stores/authStore";
import { useLesson } from "./useLesson";
import { useTranscription } from "./useTranscription";
import { notificationApi } from "../services/api";
import type { ModeId } from "../types";

export function useApp() {
  const lesson = useLesson();
  const transcription = useTranscription();
  const ui = useUiStore();
  const leftPanelCollapsed = useUiStore((s) => s.leftPanelCollapsed);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);
  const authUser = useAuthStore((s) => s.user);

  const courseStore = useCourseStore();

  const [showSettings, setShowSettings] = useState(false);
  const currentCourse =
    courseStore.courses.find((c) => c.id === courseStore.currentCourseId) || null;

  const [shareId, setShareId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("share") || null;
  });

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const canSubmit = useMemo(
    () =>
      !ui.isLoading &&
      lesson.lectureText.trim().length > 0 &&
      lesson.slidesText.trim().length > 0,
    [ui.isLoading, lesson.lectureText, lesson.slidesText]
  );

  useEffect(() => {
    lesson.fetchLessons();
    courseStore.fetchCourses();
    notificationApi.check().catch(() => {});
  }, []);

  useEffect(() => {
    if (lesson.currentLessonId) {
      lesson.loadLesson(lesson.currentLessonId);
    }
  }, [lesson.currentLessonId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          "input,textarea,[contenteditable=true]"
        )
      )
        return;

      const map: Record<string, ModeId> = {
        "1": "plan",
        "2": "alignment",
        "3": "lecturer-note",
        "4": "quiz",
        "5": "deep-dive",
        "6": "history",
        "8": "lo-study",
        "9": "cheat-sheet",
      };
      if (map[e.key]) ui.setMode(map[e.key]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ui]);

  const handleAudioUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await transcription.startTranscription(file);
    e.target.value = "";
  };

  const handlePdfUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await lesson.uploadPdf(file);
    e.target.value = "";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await lesson.generatePlan();
  }

  const handleCreateLesson = async () => {
    const name = ui.newLessonTitle.trim();
    if (!name) return;

    lesson.clearCurrentLesson();
    await lesson.createLesson(name);

    ui.setShowNewLessonModal(false);
    ui.setNewLessonTitle("");
  };

  const handleShareClose = () => {
    setShareId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("share");
    window.history.replaceState({}, "", url.toString());
  };

  const handleShareImport = (lessonId: string) => {
    setShareId(null);
    lesson.setCurrentLessonId(lessonId);
    ui.setMode("plan");
    const url = new URL(window.location.href);
    url.searchParams.delete("share");
    window.history.replaceState({}, "", url.toString());
  };

  return {
    lesson,
    transcription,
    ui,
    leftPanelCollapsed,
    toggleLeftPanel,
    authUser,
    currentCourse,
    showSettings,
    setShowSettings,
    shareId,
    isMobile,
    canSubmit,
    handleAudioUpload,
    handlePdfUpload,
    handleSubmit,
    handleCreateLesson,
    handleShareClose,
    handleShareImport,
  };
}
