import { useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useCourseStore } from "../stores/courseStore";
import { useLessonStore } from "../stores/lessonStore";
import { useUiStore } from "../stores/uiStore";
import { useStudySelectionStore } from "../stores/studySelectionStore";
import { courseApi } from "../services/api";
import { logger } from "../utils/logger";
import type { ModeId } from "../types";

const CHAT_STORAGE_PREFIX = "lc.course-chat.";

export type ChatMessage = { role: string; content: string; suggestions?: string[] };
export type ActiveTab = "overview" | "progress" | "schedule";

export function useCourseDashboard() {
  const courses = useCourseStore((s) => s.courses);
  const currentCourseId = useCourseStore((s) => s.currentCourseId);
  const fetchCourses = useCourseStore((s) => s.fetchCourses);
  const selectCourse = useCourseStore((s) => s.selectCourse);
  const deleteCourse = useCourseStore((s) => s.deleteCourse);
  const rebuildIndex = useCourseStore((s) => s.rebuildIndex);
  const removeLessonFromCourse = useCourseStore((s) => s.removeLessonFromCourse);
  const courseProgress = useCourseStore((s) => s.courseProgress);
  const weeklySchedule = useCourseStore((s) => s.weeklySchedule);
  const progressLoading = useCourseStore((s) => s.progressLoading);
  const scheduleLoading = useCourseStore((s) => s.scheduleLoading);
  const fetchCourseProgress = useCourseStore((s) => s.fetchCourseProgress);
  const generateWeeklySchedule = useCourseStore((s) => s.generateWeeklySchedule);
  const exportCourse = useCourseStore((s) => s.exportCourse);
  const setMode = useUiStore((s) => s.setMode);
  const setCurrentLessonId = useLessonStore((s) => s.setCurrentLessonId);
  const allLessons = useLessonStore((s) => s.lessons);

  const showCreateModal = useUiStore((s) => s.showCreateCourseModal);
  const setShowCreateModal = useUiStore((s) => s.setShowCreateCourseModal);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatStreamRef = useRef<AbortController | null>(null);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDetach, setConfirmDetach] = useState<{ courseId: string; lessonId: string; title: string } | null>(null);

  // Selection store
  const selection = useStudySelectionStore();

  useEffect(() => {
    fetchCourses();
  }, []);

  // Course switch guard: clear selection if course changed
  useEffect(() => {
    if (selection.isSelectionMode && currentCourseId !== selection.courseIdForSelection) {
      selection.exitSelectionMode();
    }
  }, [currentCourseId, selection]);

  const course = courses.find((c) => c.id === currentCourseId) || null;

  useEffect(() => {
    if (!course) return;
    const saved = localStorage.getItem(CHAT_STORAGE_PREFIX + course.id);
    if (saved) {
      try { setChatHistory(JSON.parse(saved)); } catch { setChatHistory([]); }
    } else {
      setChatHistory([]);
    }
  }, [course?.id]);

  useEffect(() => {
    if (!course || chatHistory.length === 0) return;
    localStorage.setItem(CHAT_STORAGE_PREFIX + course.id, JSON.stringify(chatHistory));
  }, [chatHistory, course?.id]);

  useEffect(() => {
    if (course) fetchCourseProgress(course.id);
  }, [course?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  const goToLesson = useCallback(
    (lessonId: string, mode: ModeId = "plan") => {
      setCurrentLessonId(lessonId);
      setMode(mode);
    },
    [setCurrentLessonId, setMode]
  );

  const handleCourseChat = useCallback((customMsg?: string) => {
    const msg = (customMsg || chatInput).trim();
    if (!msg || !course) return;

    // Cancel any in-flight stream before starting a new one
    chatStreamRef.current?.abort();

    setChatInput("");
    // Capture history snapshot before adding the user message so the backend
    // sees the same conversation context the user saw when sending.
    const historySnapshot = chatHistory;
    setChatHistory((h) => [
      ...h,
      { role: "user", content: msg },
      // Optimistic placeholder: chunks stream into the last assistant message.
      { role: "assistant", content: "" },
    ]);
    setChatLoading(true);

    const courseId = course.id;
    const appendChunk = (chunk: string) => {
      setChatHistory((h) => {
        const next = [...h];
        const last = next[next.length - 1];
        if (last && last.role === "assistant") {
          next[next.length - 1] = { ...last, content: last.content + chunk };
        }
        return next;
      });
    };

    chatStreamRef.current = courseApi.courseChatStream(
      courseId,
      msg,
      historySnapshot.map((h) => ({ role: h.role, content: h.content })),
      appendChunk,
      (suggestions) => {
        setChatHistory((h) => {
          const next = [...h];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            // Strip the trailing "**Suggested Questions:**" block from the text
            // if suggestions were extracted — they render separately as chips.
            let cleaned = last.content;
            if (suggestions.length > 0) {
              cleaned = cleaned.replace(/\*\*Suggested Questions:\*\*[\s\S]*$/, "").trimEnd();
            }
            next[next.length - 1] = {
              ...last,
              content: cleaned,
              suggestions: suggestions.length > 0 ? suggestions : undefined,
            };
          }
          return next;
        });
        setChatLoading(false);
        chatStreamRef.current = null;
      },
      (error) => {
        logger.warn("Course chat stream error:", error);
        setChatHistory((h) => {
          const next = [...h];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content: last.content
                ? last.content + "\n\n[Akış kesildi: " + error + "]"
                : "Sohbet hatası: " + error,
            };
          }
          return next;
        });
        toast.error("Sohbet hatası: " + error);
        setChatLoading(false);
        chatStreamRef.current = null;
      },
    );
  }, [chatInput, course, chatHistory]);

  // Cleanup: cancel in-flight stream on unmount
  useEffect(() => {
    return () => {
      chatStreamRef.current?.abort();
    };
  }, []);

  const clearChat = useCallback(() => {
    setChatHistory([]);
    if (course) localStorage.removeItem(CHAT_STORAGE_PREFIX + course.id);
  }, [course?.id]);

  const createLesson = useCallback(() => {
    setMode("create-lesson");
  }, [setMode]);

  const courseLessons = course
    ? course.lessonIds
        .map((id) => {
          const l = allLessons.find((les) => les.id === id);
          if (!l) return null;
          return {
            id: l.id,
            title: l.title,
            date: l.date,
            hasSlides: !!l.slideText,
            hasTranscript: !!l.transcript,
            hasPlan: !!l.plan,
            hasQuiz: !!l.plan?.seed_quiz?.length,
          };
        })
        .filter(Boolean) as Array<{ id: string; title: string; date: string; hasSlides: boolean; hasTranscript: boolean; hasPlan: boolean; hasQuiz: boolean }>
    : [];

  const enterSelectionMode = useCallback(() => {
    if (course) selection.enterSelectionMode(course.id);
  }, [course, selection]);

  const handleSelectAll = useCallback(() => {
    selection.selectAll(courseLessons.map((l) => l.id));
  }, [courseLessons, selection]);

  const studySelected = useCallback(() => {
    if (selection.selectedLessonIds.length === 0) return;
    setCurrentLessonId(selection.selectedLessonIds[0]);
    setMode("plan");
  }, [selection.selectedLessonIds, setCurrentLessonId, setMode]);

  return {
    courses,
    course,
    courseLessons,
    selectCourse,
    deleteCourse,
    rebuildIndex,
    removeLessonFromCourse,
    exportCourse,
    courseProgress,
    weeklySchedule,
    progressLoading,
    scheduleLoading,
    generateWeeklySchedule,
    showCreateModal,
    setShowCreateModal,
    showAssignModal,
    setShowAssignModal,
    chatInput,
    setChatInput,
    chatHistory,
    chatLoading,
    activeTab,
    setActiveTab,
    chatBottomRef,
    confirmRebuild,
    setConfirmRebuild,
    confirmDelete,
    setConfirmDelete,
    confirmDetach,
    setConfirmDetach,
    goToLesson,
    createLesson,
    handleCourseChat,
    clearChat,
    // Selection
    isSelectionMode: selection.isSelectionMode,
    selectedLessonIds: selection.selectedLessonIds,
    enterSelectionMode,
    exitSelectionMode: selection.exitSelectionMode,
    toggleLesson: selection.toggleLesson,
    handleSelectAll,
    clearSelection: selection.clearAll,
    studySelected,
  };
}
