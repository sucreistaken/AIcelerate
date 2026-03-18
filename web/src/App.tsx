// src/App.tsx - Refactored with Zustand, React Router, and Lazy Loading
import React, { Suspense, lazy, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Book, X, Database } from "lucide-react";


// Stores
import { useLessonStore } from "./stores/lessonStore";
import { useUiStore } from "./stores/uiStore";
import { useRoomStore } from "./stores/roomStore";
import { useCourseStore } from "./stores/courseStore";
import { useAuthStore } from "./stores/authStore";

// Hooks
import { useLesson } from "./hooks/useLesson";
import { useTranscription } from "./hooks/useTranscription";
import { notificationApi } from "./services/api";

// Components (eagerly loaded)
import ModeRibbon from "./components/ModeRibbon";
import ThemeToggle from "./components/ui/ThemeToggle";
import { MobileNav } from "./components/layout/MobileNav";
import { Skeleton, CardSkeleton } from "./components/ui/Skeleton";
import { PaneErrorBoundary } from "./components/ui/ErrorBoundary";
import { NoPlanEmpty } from "./components/ui/EmptyState";
import ShareButton from "./components/ui/ShareButton";
import ShareModal from "./components/ui/ShareModal";
import NicknamePrompt from "./components/ui/NicknamePrompt";
import IdentityBadge from "./components/ui/IdentityBadge";
import NotificationBell from "./components/ui/NotificationBell";
import SchedulerWidget from "./components/SchedulerWidget";
import AuthGuard from "./components/auth/AuthGuard";
import AmbientBackground from "./components/ui/AmbientBackground";
import CursorGlow from "./components/ui/CursorGlow";
import ParticleField from "./components/ui/ParticleField";

const SettingsPage = lazy(() => import("./components/settings/SettingsPage"));
const WelcomeGuide = lazy(() => import("./components/ui/WelcomeGuide"));

// Lazy loaded panes
const PlanPane = lazy(() => import("./components/PlanPane"));
const AlignmentPane = lazy(() => import("./components/AlignmentPane"));
const LecturerNotePane = lazy(() => import("./components/LecturerNotePane"));
const QuizPane = lazy(() => import("./components/QuizPane"));
const LoStudyPane = lazy(() => import("./components/LoStudyPane"));
const CheatSheetPane = lazy(() => import("./components/CheatSheetPane"));
const LessonsHistoryPane = lazy(() => import("./components/LessonsHistoryPane"));
const DeepDivePane = lazy(() => import("./components/DeepDivePane"));
// DISABLED: const ExamSprintPane = lazy(() => import("./components/ExamSprintPane"));
const DeviationPane = lazy(() => import("./components/DeviationPane"));
const MindMapPane = lazy(() => import("./components/MindMapPane"));
const NotesPane = lazy(() => import("./components/NotesPane"));
// DISABLED: const WeaknessPane = lazy(() => import("./components/WeaknessPane"));
const FlashcardPane = lazy(() => import("./components/FlashcardPane"));
const ConnectionsPane = lazy(() => import("./components/ConnectionsPane"));
// DISABLED: const StudyRoomPane = lazy(() => import("./components/StudyRoomPane"));
const CourseDashboard = lazy(() => import("./components/CourseDashboard"));
const StudyHub = lazy(() => import("./components/collab-v2/layout/StudyHub"));

// Loading fallback
function PaneLoading() {
  return (
    <div className="lc-section" style={{ padding: "24px" }}>
      <Skeleton height={24} width="40%" />
      <div style={{ marginTop: "16px" }}>
        <Skeleton lines={4} />
      </div>
    </div>
  );
}

// --- Time Helpers ---
function fmtTime(sec: number) {
  const s = Math.max(0, sec || 0);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function CollapsibleSection({
  title,
  summary,
  defaultOpen = true,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="form-section">
      <button
        type="button"
        className="collapsible-section__trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="form-section__title" style={{ marginBottom: 0 }}>
          {title}
        </span>
        {!open && summary && (
          <span className="collapsible-section__summary">{summary}</span>
        )}
        <svg
          className={`collapsible-section__chevron${open ? " collapsible-section__chevron--open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="collapsible-section__content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavigationChip() {
  const courseStore = useCourseStore();
  const lessonStore = useLessonStore();
  const ui = useUiStore();
  const [open, setOpen] = useState(false);

  const currentCourse = courseStore.courses.find((c) => c.id === courseStore.currentCourseId) || null;
  const currentLesson = lessonStore.lessons.find((l) => l.id === lessonStore.currentLessonId) || null;

  const courseLabel = currentCourse ? currentCourse.code : "All Courses";
  const lessonLabel = currentLesson ? currentLesson.title : "No Lesson";

  const filteredLessons = currentCourse
    ? lessonStore.lessons.filter((l) => currentCourse.lessonIds.includes(l.id))
    : lessonStore.lessons;

  const otherLessons = currentCourse
    ? lessonStore.lessons.filter((l) => !currentCourse.lessonIds.includes(l.id))
    : [];

  return (
    <div className="nav-chip">
      <button className="nav-chip__trigger" onClick={() => setOpen(!open)}>
        <span className="nav-chip__course">{courseLabel}</span>
        <span className="nav-chip__sep">/</span>
        <span className="nav-chip__lesson">{lessonLabel}</span>
        <svg
          className={`nav-chip__chevron${open ? " nav-chip__chevron--open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="nav-chip__panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <select
              className="lc-select"
              value={courseStore.currentCourseId || ""}
              onChange={(e) => courseStore.selectCourse(e.target.value || null)}
            >
              <option value="">-- All Courses --</option>
              {courseStore.courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
            {currentCourse && (
              <div className="muted small">
                {currentCourse.lessonIds.length} lesson{currentCourse.lessonIds.length !== 1 ? "s" : ""}
                {currentCourse.settings?.examDate ? ` | Exam: ${currentCourse.settings.examDate}` : ""}
              </div>
            )}
            <select
              className="lc-select"
              value={lessonStore.currentLessonId ?? (ui.draftTitle ? "__draft__" : "")}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__new__") {
                  lessonStore.clearCurrentLesson();
                  ui.setDraftTitle("");
                  ui.setShowNewLessonModal(true);
                  return;
                }
                if (val === "__draft__") return;
                lessonStore.setCurrentLessonId(val === "" ? null : val);
                if (val) localStorage.setItem("lc.lastLessonId", val);
                else localStorage.removeItem("lc.lastLessonId");
              }}
            >
              <option value="">-- Select Lesson --</option>
              <option value="__new__" className="fw-700">+ Create New Lesson</option>
              {ui.draftTitle && <option value="__draft__">Draft: {ui.draftTitle}</option>}
              {filteredLessons.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
              {otherLessons.length > 0 && (
                <optgroup label="Other Lessons">
                  {otherLessons.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  // Zustand stores
  const lesson = useLesson();
  const transcription = useTranscription();
  const ui = useUiStore();
  const leftPanelCollapsed = useUiStore((s) => s.leftPanelCollapsed);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Room store
  const roomStore = useRoomStore();

  // Course store
  const courseStore = useCourseStore();

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const currentCourse = courseStore.courses.find((c) => c.id === courseStore.currentCourseId) || null;

  // Share link detection
  const [shareId, setShareId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("share") || null;
  });

  // Room code detection from URL (?room=CODE)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const roomCode = sp.get("room");
    if (roomCode && roomStore.identity) {
      ui.setMode("study-room");
      roomStore.joinRoomByCode(roomCode);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, "", url.toString());
    }
  }, [roomStore.identity]);

  // Detect if on mobile (reactive)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Submit check
  const canSubmit = useMemo(
    () => !ui.isLoading && lesson.lectureText.trim().length > 0 && lesson.slidesText.trim().length > 0,
    [ui.isLoading, lesson.lectureText, lesson.slidesText]
  );

  // Fetch lessons and courses on mount, trigger notification check
  useEffect(() => {
    lesson.fetchLessons();
    courseStore.fetchCourses();
    notificationApi.check().catch(() => { });
  }, []);

  // Load current lesson when ID changes
  useEffect(() => {
    if (lesson.currentLessonId) {
      lesson.loadLesson(lesson.currentLessonId);
    }
  }, [lesson.currentLessonId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,[contenteditable=true]")) return;

      const map: Record<string, typeof ui.mode> = {
        "1": "plan",
        "2": "alignment",
        "3": "lecturer-note",
        "4": "quiz",
        "5": "deep-dive",
        "6": "exam-sprint",
        "7": "history",
        "8": "lo-study",
        "9": "cheat-sheet",
      };
      if (map[e.key]) ui.setMode(map[e.key]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ui]);

  // --- Audio Upload Handler ---
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await transcription.startTranscription(file);
    e.target.value = "";
  };

  // --- PDF Upload Handler ---
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await lesson.uploadPdf(file);
    e.target.value = "";
  };

  // --- Submit Handler ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await lesson.generatePlan();
  }

  // --- Create Lesson Handler ---
  const handleCreateLesson = async () => {
    const name = ui.newLessonTitle.trim();
    if (!name) return;

    lesson.clearCurrentLesson();
    await lesson.createLesson(name);

    ui.setShowNewLessonModal(false);
    ui.setNewLessonTitle("");
  };

  // --- Render Current Pane ---
  const renderPane = () => {
    return (
      <PaneErrorBoundary key={`eb-${ui.mode}`}>
        <Suspense fallback={<PaneLoading />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={ui.mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {ui.mode === "plan" && (
                lesson.plan ? <PlanPane plan={lesson.plan} /> : (lesson.currentLessonId ? <NoPlanEmpty /> : <WelcomeGuide />)
              )}

              {ui.mode === "alignment" && (
                lesson.plan ? (
                  <AlignmentPane plan={lesson.plan} deviation={lesson.deviation} />
                ) : (
                  <NoPlanEmpty />
                )
              )}

              {ui.mode === "deviation" && (
                <DeviationPane
                  deviation={lesson.deviation as any}
                  loading={ui.devLoading}
                  error={ui.devErr}
                  onGenerate={lesson.analyzeDeviation}
                  onReanalyze={lesson.reanalyzeDeviation}
                />
              )}

              {ui.mode === "lecturer-note" && (
                <LecturerNotePane
                  lectureText={lesson.lectureText}
                  slidesText={lesson.slidesText}
                  emphases={lesson.plan?.emphases || []}
                  learningOutcomes={lesson.learningOutcomes}
                  loAlignment={lesson.loAlignment}
                />
              )}

              {ui.mode === "quiz" && (
                <QuizPane
                  quiz={lesson.quiz}
                  setQuiz={lesson.setQuiz}
                  hasPlan={!!lesson.plan}
                  plan={lesson.plan}
                />
              )}

              {ui.mode === "lo-study" && <LoStudyPane modules={lesson.loModules || []} />}

              {ui.mode === "cheat-sheet" && (
                <CheatSheetPane
                  cheatSheet={lesson.cheatSheet}
                  loading={ui.cheatLoading}
                  error={ui.cheatErr}
                  onGenerate={lesson.generateCheatSheet}
                />
              )}

              {ui.mode === "history" && (
                <LessonsHistoryPane
                  currentLessonId={lesson.currentLessonId}
                  setMode={ui.setMode}
                  setQuiz={lesson.setQuiz}
                  onSelectLesson={(id) => {
                    lesson.setCurrentLessonId(id);
                    ui.setMode("plan");
                  }}
                />
              )}

              {ui.mode === "deep-dive" && <DeepDivePane />}
              {ui.mode === "mindmap" && <MindMapPane />}
              {/* DISABLED: exam-sprint, weakness */}
              {ui.mode === "flashcards" && <FlashcardPane />}
              {ui.mode === "connections" && <ConnectionsPane />}
              {ui.mode === "notes" && <NotesPane />}
              {/* DISABLED: study-room */}
              {ui.mode === "study-hub" && <StudyHub />}
              {ui.mode === "course-dashboard" && <CourseDashboard />}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </PaneErrorBoundary>
    );
  };

  return (
    <AuthGuard>
      <AmbientBackground />
      <CursorGlow />
      <ParticleField />
      <div className="page" style={{ position: "relative", zIndex: 1 }}>
        {/* Navbar */}
        <nav className="nav" role="navigation" aria-label="Ana navigasyon">
          <div className="nav-inner">
            <div className="brand">
              <span className="brand-text">AIcelerate</span>
              <div className="pill">v3.0</div>
            </div>
            <div className="flex-1" />
            <div className="nav-divider" />
            <div className="nav-actions">
              <NotificationBell />
              {authUser && (
                <span className="nav-user-name" style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>
                  {authUser.profile.nickname}
                </span>
              )}
              <button
                className="nav-settings-btn"
                onClick={() => setShowSettings(true)}
                title="Settings"
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "var(--text-lg)", padding: "var(--space-1)" }}
              >
                &#9881;
              </button>
              <ShareButton />
              <ThemeToggle />
            </div>
          </div>
        </nav>

        <div className="lc-container">
          <header className="hero">
            <h1 className="h1">
              {lesson.lessons.find(l => l.id === lesson.currentLessonId)?.title || "AIcelerate"}
            </h1>
            <div className="hero-breadcrumb">
              {currentCourse && (
                <>
                  <span className="hero-breadcrumb__sep">/</span>
                  <span style={{ color: "var(--accent-2)" }}>{currentCourse.code}</span>
                </>
              )}
              <span className="hero-breadcrumb__sep">/</span>
              <span>{ui.mode.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
            </div>
          </header>

          {/* Navigation Chip — hero ile shell arasında */}
          <NavigationChip />

          <div className={`lc-shell${ui.mode === "study-room" || ui.mode === "study-hub" ? " lc-shell--room" : ""}`}>
            {/* LEFT: Form or Collapsed Bar */}
            {ui.mode !== "study-room" && ui.mode !== "study-hub" && (
              leftPanelCollapsed ? (
                <div className="lc-sidebar-mini">
                  <button className="lc-sidebar-mini__btn" onClick={toggleLeftPanel} title="Open Knowledge Base">
                    <Database size={20} />
                  </button>
                </div>
              ) : (
                <div className="lc-sidebar-drawer">
                  <div className="lc-sidebar-drawer__header">
                    <div className="lc-sidebar-drawer__inner-title">
                      <Database size={18} className="text-accent-2" style={{ color: "var(--accent-2)" }} />
                      Knowledge Base
                    </div>
                    <button className="lc-sidebar-drawer__close" onClick={toggleLeftPanel} title="Collapse panel">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="lc-sidebar-drawer__content">
                    {/* Quick start guide */}
                    {!lesson.currentLessonId && (
                      <div style={{
                        padding: "10px 14px", borderRadius: 8, marginBottom: 12,
                        background: "var(--accent-2)08", border: "1px solid var(--accent-2)18",
                        fontSize: 12, color: "var(--muted)", lineHeight: 1.6,
                      }}>
                        <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4, fontSize: 13 }}>
                          Baslamak icin:
                        </div>
                        <div>1. Slayt icerigi girin (PDF yukle veya yapistir)</div>
                        <div>2. Transkript girin (ses yukle veya yapistir)</div>
                        <div>3. <b>Plan & Analyze</b> butonuna basin</div>
                      </div>
                    )}
                    <form className="lc-sidebar-form" onSubmit={handleSubmit} aria-label="Lesson form">
                      {/* Course Code & LO */}
                      <CollapsibleSection
                        title="Course Info"
                        summary={lesson.courseCode.trim() ? `${lesson.courseCode}${lesson.learningOutcomes.length ? ` · ${lesson.learningOutcomes.length} LOs` : ""}` : "No course code"}
                        defaultOpen={!lesson.courseCode.trim()}
                      >
                        <label className="label" htmlFor="course-code" style={{ marginTop: 8 }}>Course Code (IEU Syllabus)</label>
                        <div className="flex-between mb-2" style={{ gap: 8 }}>
                          <input
                            id="course-code"
                            className="lc-textarea input"
                            placeholder="Ex: MATH 153"
                            value={lesson.courseCode}
                            onChange={(e) => lesson.setCourseCode(e.target.value)}
                            aria-label="Course code"
                          />
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={lesson.fetchLearningOutcomes}
                            disabled={!lesson.courseCode.trim() || ui.loLoading}
                            aria-busy={ui.loLoading}
                          >
                            {ui.loLoading ? "Fetching LOs..." : "Fetch LOs"}
                          </button>
                        </div>

                        {lesson.learningOutcomes.length > 0 && (
                          <div className="muted-block small mb-3" role="region" aria-label="Learning Outcomes">
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Learning Outcomes</div>
                            <ol className="ol">
                              {lesson.learningOutcomes.map((lo, i) => (
                                <li key={i} className="small">{`LO${i + 1}`} – {lo}</li>
                              ))}
                            </ol>
                            <button
                              type="button"
                              className="btn btn-ghost mt-2"
                              onClick={lesson.analyzeDeviation}
                              disabled={!lesson.currentLessonId || ui.devLoading}
                            >
                              {ui.devLoading ? "Analyzing deviation..." : "Slide Deviation Analysis"}
                            </button>

                            {ui.devErr && <div className="error mt-2 text-red-500 text-sm">{ui.devErr}</div>}

                            <button
                              type="button"
                              className="btn btn-ghost mt-2"
                              onClick={lesson.alignWithLO}
                              disabled={!lesson.currentLessonId || ui.isLoading}
                            >
                              {ui.isLoading ? "Aligning..." : "Align with Transcript"}
                            </button>

                            <button
                              type="button"
                              className="btn btn-ghost mt-2"
                              onClick={lesson.generateLoModules}
                              disabled={!lesson.currentLessonId || ui.loModulesLoading || !lesson.learningOutcomes.length}
                            >
                              {ui.loModulesLoading ? "Generating LO Study..." : "Create LO Study Mode"}
                            </button>
                          </div>
                        )}

                      </CollapsibleSection>

                      {/* PDF Upload */}
                      <CollapsibleSection
                        title="Slides"
                        summary={lesson.slidesText.trim() ? `${lesson.slidesText.trim().length.toLocaleString()} chars` : "Empty"}
                        defaultOpen={!lesson.slidesText.trim()}
                      >
                        <div className="flex-between mb-2">
                          <label className="label m-0">Slide</label>
                          <div className="file-upload-wrapper">
                            <label
                              htmlFor="pdf-upload"
                              className="btn-small"
                            >
                              📄 Upload PDF / Slides
                            </label>
                            <input
                              id="pdf-upload"
                              type="file"
                              accept=".pdf"
                              onChange={handlePdfUpload}
                              style={{ display: "none" }}
                            />
                            {ui.isLoading && ui.loadingMessage?.includes("PDF") && (
                              <div className="mt-2">
                                <div style={{
                                  height: 4,
                                  background: 'var(--border)',
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                  width: '100%'
                                }}>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                                    style={{
                                      height: '100%',
                                      background: 'var(--accent-2)',
                                      borderRadius: 2
                                    }}
                                  />
                                </div>
                                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: 'center' }}>
                                  {ui.loadingMessage}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <textarea
                          className="lc-textarea textarea"
                          value={lesson.slidesText}
                          onChange={(e) => lesson.setSlidesText(e.target.value)}
                          placeholder="Slide content will appear here..."
                          rows={6}
                          aria-label="Slide content"
                        />

                      </CollapsibleSection>

                      <CollapsibleSection
                        title="Transcript"
                        summary={lesson.lectureText.trim() ? `${lesson.lectureText.trim().length.toLocaleString()} chars` : "Empty"}
                        defaultOpen={!lesson.lectureText.trim()}
                      >
                        <label className="label">Speech to Text</label>

                        <div className="stt-row">
                          <div className="stt-left">
                            <span className="stt-hint">
                              {transcription.stt.status || "You can edit this manually if needed."}
                              {transcription.stt.now && (
                                <span className="stt-now">
                                  {fmtTime(transcription.stt.now.start)}–{fmtTime(transcription.stt.now.end)}
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="stt-right">
                            <label
                              className="stt-upload"
                              htmlFor="audio-upload"
                              title="Upload Audio & Transcribe"
                            >
                              🎙️ Upload Audio
                            </label>

                            <button
                              type="button"
                              className="stt-clear"
                              onClick={transcription.clearTranscription}
                              title="Clear transcript"
                            >
                              Clear
                            </button>

                            <input
                              id="audio-upload"
                              type="file"
                              accept=".mp3,.wav,.m4a,.flac,.ogg"
                              onChange={handleAudioUpload}
                              style={{ display: "none" }}
                            />
                          </div>
                        </div>

                        <div className="stt-progress" aria-hidden={transcription.stt.progress <= 0}>
                          <div className="stt-progress-bar" style={{ width: `${transcription.stt.progress}%` }} />
                        </div>

                        <textarea
                          className="lc-textarea textarea"
                          value={lesson.lectureText}
                          onChange={(e) => lesson.setLectureText(e.target.value)}
                          placeholder="Video transcript goes here..."
                          rows={6}
                          aria-label="Transcript"
                        />

                      </CollapsibleSection>

                      <div className="actions actions--sticky">
                        <button
                          type="submit"
                          disabled={!canSubmit}
                          className={canSubmit ? "btn" : "btn btn--disabled"}
                          aria-busy={ui.isLoading}
                          style={{ width: "100%", padding: "12px" }}
                        >
                          {ui.isLoading ? "Analyzing..." : "Plan & Analyze"}
                        </button>
                        {!canSubmit && !ui.isLoading && (
                          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>
                            Slayt ve transkript alanlarini doldurun
                          </div>
                        )}
                        {canSubmit && !ui.isLoading && (
                          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>
                            AI ogrenme plani, quiz, eslestirme ve vurgular olusturacak
                          </div>
                        )}

                        {lesson.error && (
                          <div className="error mt-2 text-red-500 text-sm" role="alert">
                            {lesson.error}
                          </div>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )
            )}

            {/* RIGHT: Panels */}
            <div className="lc-plan-pane">
              <ModeRibbon mode={ui.mode} setMode={ui.setMode} />
              {(ui.mode === "plan" || ui.mode === "exam-sprint" || ui.mode === "course-dashboard") && (
                <SchedulerWidget />
              )}
              {renderPane()}
            </div>
          </div>
        </div>

        {/* STT Toast */}
        <AnimatePresence>
          {transcription.stt.toast && (
            <motion.div
              className="stt-toast"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              {transcription.stt.toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Modal */}
        <AnimatePresence>
          {shareId && (
            <ShareModal
              shareId={shareId}
              onClose={() => {
                setShareId(null);
                const url = new URL(window.location.href);
                url.searchParams.delete("share");
                window.history.replaceState({}, "", url.toString());
              }}
              onImport={(lessonId) => {
                setShareId(null);
                lesson.setCurrentLessonId(lessonId);
                ui.setMode("plan");
                const url = new URL(window.location.href);
                url.searchParams.delete("share");
                window.history.replaceState({}, "", url.toString());
              }}
            />
          )}
        </AnimatePresence>

        {/* Mobile Navigation */}
        {isMobile && <MobileNav />}

        {/* New Lesson Modal */}
        <AnimatePresence>
          {ui.showNewLessonModal && (
            <motion.div
              className="modal-backdrop"
              onClick={() => ui.setShowNewLessonModal(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <motion.div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <div id="modal-title" className="modal-title h3 mb-4">
                  Create New Lesson
                </div>
                <input
                  autoFocus
                  className="lc-textarea input mb-4 w-full"
                  placeholder="Ex: Calculus 101"
                  value={ui.newLessonTitle}
                  onChange={(e) => ui.setNewLessonTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateLesson();
                    if (e.key === "Escape") ui.setShowNewLessonModal(false);
                  }}
                  aria-label="Lesson name"
                />
                <div className="modal-actions flex justify-end gap-2">
                  <button
                    className="btn btn-secondary"
                    onClick={() => ui.setShowNewLessonModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateLesson}
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nickname Prompt - shown when entering study-room without identity */}
        {ui.mode === "study-room" && <NicknamePrompt />}

        {/* Settings Modal */}
        {showSettings && (
          <Suspense fallback={null}>
            <SettingsPage onClose={() => setShowSettings(false)} />
          </Suspense>
        )}
      </div>
    </AuthGuard>
  );
}
