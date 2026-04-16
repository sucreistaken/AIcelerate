// src/hooks/useLessonWizard.ts
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useLessonStore, type Lesson } from "../stores/lessonStore";
import { useCourseStore } from "../stores/courseStore";
import { useUiStore } from "../stores/uiStore";
import { useTranscription } from "./useTranscription";
import { useStreamingAnalysis } from "./useStreamingAnalysis";
import { lessonsApi, planApi, courseApi } from "../services/api";
import { t } from "../utils/i18n";
import type { Plan } from "../types";

export type WizardStep = 1 | 2 | 3 | 4;

interface WizardState {
  step: WizardStep;
  title: string;
  weekNumber: string;
  selectedCourseId: string | null;
  lessonId: string | null;
  slidesText: string;
  isCreating: boolean;
  isUploadingPdf: boolean;
  isAnalyzing: boolean;
  analysisCompleted: boolean;
  error: string | null;
  pdfFileName: string | null;
}

const INITIAL: WizardState = {
  step: 1, title: "", weekNumber: "", selectedCourseId: null, lessonId: null, slidesText: "",
  isCreating: false, isUploadingPdf: false, isAnalyzing: false, analysisCompleted: false,
  error: null, pdfFileName: null,
};

export function useLessonWizard() {
  const lessonStore = useLessonStore();
  const courseStore = useCourseStore();
  const ui = useUiStore();
  const transcription = useTranscription();
  const streaming = useStreamingAnalysis();
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<WizardState>({
    ...INITIAL,
    selectedCourseId: courseStore.currentCourseId,
  });

  const selectedCourse = useMemo(
    () => courseStore.courses.find((c) => c.id === state.selectedCourseId) || null,
    [courseStore.courses, state.selectedCourseId]
  );

  // Keep backward compat alias
  const currentCourse = selectedCourse;

  const lectureText = lessonStore.lectureText;
  const hasProgress = !!state.lessonId;

  // Navigation guard: warn on accidental mode change
  useEffect(() => {
    if (!hasProgress) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasProgress]);

  const setStep = useCallback((step: WizardStep) => setState((s) => ({ ...s, step, error: null })), []);
  const setTitle = useCallback((title: string) => setState((s) => ({ ...s, title })), []);
  const setWeekNumber = useCallback((weekNumber: string) => setState((s) => ({ ...s, weekNumber })), []);
  const setSlidesText = useCallback((slidesText: string) => setState((s) => ({ ...s, slidesText })), []);
  const setError = useCallback((error: string | null) => setState((s) => ({ ...s, error })), []);
  const setSelectedCourseId = useCallback((id: string | null) => setState((s) => ({ ...s, selectedCourseId: id })), []);

  // Step 1 → Next
  const createLessonAndNext = useCallback(async () => {
    if (!state.title.trim()) { setError("Ders başlığı gerekli"); return; }
    if (!state.selectedCourseId) { setError("Kurs seçimi zorunlu"); return; }
    setState((s) => ({ ...s, isCreating: true, error: null }));
    try {
      const weekPrefix = state.weekNumber ? `Week ${state.weekNumber} - ` : "";
      const result = await lessonsApi.create(`${weekPrefix}${state.title}`);
      if (!result) { setState((s) => ({ ...s, isCreating: false, error: "Ders oluşturulamadı" })); return; }
      await courseApi.addLesson(state.selectedCourseId, result.id);
      courseStore.selectCourse(state.selectedCourseId);
      await courseStore.fetchCourses();
      lessonStore.setCurrentLessonId(result.id);
      lessonStore.setLessons(await lessonsApi.getAll() as Lesson[]);
      setState((s) => ({ ...s, lessonId: result.id, isCreating: false, step: 2, error: null }));
    } catch (e: unknown) {
      setState((s) => ({ ...s, isCreating: false, error: e instanceof Error ? e.message : "Bir hata oluştu" }));
    }
  }, [state.title, state.weekNumber, state.selectedCourseId, courseStore, lessonStore, setError]);

  // Step 2: PDF upload
  const handlePdfUpload = useCallback(async (file: File) => {
    if (!state.lessonId) return;
    setState((s) => ({ ...s, isUploadingPdf: true, error: null }));
    try {
      const result = await lessonsApi.uploadSlides(state.lessonId, file);
      if (result.ok && result.text) {
        const text = result.text;
        setState((s) => ({ ...s, slidesText: s.slidesText ? s.slidesText + "\n\n" + text : text, isUploadingPdf: false, pdfFileName: file.name }));
        lessonStore.setSlidesText(result.text);
      } else {
        setState((s) => ({ ...s, isUploadingPdf: false, error: "PDF işlenemedi" }));
      }
    } catch (e: unknown) {
      setState((s) => ({ ...s, isUploadingPdf: false, error: e instanceof Error ? e.message : "PDF yükleme hatası" }));
    }
  }, [state.lessonId, lessonStore]);

  // Step 3: Audio upload
  const handleAudioUpload = useCallback(async (file: File) => {
    await transcription.startTranscription(file);
  }, [transcription]);

  // Step 4: Analyze (streaming)
  const handleAnalyze = useCallback(() => {
    const slides = state.slidesText || lessonStore.slidesText;
    const hasSlides = !!slides?.trim();
    const hasTranscript = !!lectureText?.trim();
    if (!hasSlides && !hasTranscript) { setError(t("wizard.needBoth")); return; }
    setState((s) => ({ ...s, isAnalyzing: true, error: null }));

    streaming.startStream(
      {
        lectureText,
        slidesText: slides,
        title: state.title,
        lessonId: state.lessonId || undefined,
        courseCode: currentCourse?.code,
        learningOutcomes: currentCourse?.learningOutcomes,
      },
      async (plan, lessonId) => {
        // Stream complete — update stores
        lessonStore.setPlan(plan as Plan);
        if (lessonId) { lessonStore.setCurrentLessonId(lessonId); }
        lessonStore.setLessons(await lessonsApi.getAll() as Lesson[]);
        if (state.selectedCourseId) { courseStore.rebuildIndex(state.selectedCourseId); }

        // Brief delay for completion animation to show
        completionTimerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, isAnalyzing: false, analysisCompleted: true }));
          ui.setMode("plan");
        }, 800);
      },
    );
  }, [state, lectureText, currentCourse, lessonStore, courseStore, ui, streaming, setError]);

  const nextStep = useCallback(() => { if (state.step < 4) setStep((state.step + 1) as WizardStep); }, [state.step, setStep]);
  const prevStep = useCallback(() => { if (state.step > 1) setStep((state.step - 1) as WizardStep); }, [state.step, setStep]);

  const goBack = useCallback(async () => {
    if (hasProgress && !state.analysisCompleted) {
      if (!window.confirm("Analiz tamamlanmadı. Çıkarsanız oluşturulan ders silinecek. Emin misiniz?")) return;
      // Yarım dersi sil
      if (state.lessonId) {
        await lessonsApi.delete(state.lessonId);
        lessonStore.setLessons(await lessonsApi.getAll() as Lesson[]);
      }
    } else if (hasProgress) {
      if (!window.confirm("Wizard'dan çıkmak istediğinize emin misiniz?")) return;
    }
    ui.setMode("dashboard");
  }, [ui, hasProgress, state.analysisCompleted, state.lessonId, lessonStore]);

  const canProceed = useMemo(() => {
    switch (state.step) {
      case 1: return state.title.trim().length > 0 && !!state.selectedCourseId;
      case 2: case 3: return true;
      case 4: return (state.slidesText.length > 0 || lectureText.length > 0);
      default: return false;
    }
  }, [state.step, state.title, state.selectedCourseId, state.slidesText, lectureText]);

  // Sync streaming errors to wizard state
  useEffect(() => {
    if (streaming.error) {
      setState((s) => ({ ...s, isAnalyzing: false, error: streaming.error }));
    }
  }, [streaming.error]);

  // Cleanup completion timer on unmount
  useEffect(() => {
    return () => { if (completionTimerRef.current) clearTimeout(completionTimerRef.current); };
  }, []);

  return {
    ...state, currentCourse, selectedCourse, courses: courseStore.courses,
    lectureText, stt: transcription.stt, canProceed, hasProgress,
    streaming,
    setTitle, setWeekNumber, setSelectedCourseId, setSlidesText, setError, setStep,
    createLessonAndNext, handlePdfUpload, handleAudioUpload, handleAnalyze,
    clearTranscription: transcription.clearTranscription,
    cancelTranscription: transcription.cancelTranscription,
    nextStep, prevStep, goBack,
  };
}
