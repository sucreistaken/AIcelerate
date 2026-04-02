import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  MessageSquare,
  Target,
  GitCompare,
  GraduationCap,
  CheckCircle,
  HelpCircle,
  Layers,
  CreditCard,
  Zap,
  PenLine,
  Network,
  Share2,
  History,
  Users,
  Upload,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { useUiStore } from "../../stores/uiStore";
import { useLessonStore } from "../../stores/lessonStore";
import { useCourseStore } from "../../stores/courseStore";
import { t } from "../../utils/i18n";
import type { ModeId } from "../../types";
import "./AppSidebar.css";

/* ─── Tool groups shown under selected lesson ─── */

interface ToolDef {
  id: ModeId;
  labelKey: string;
  icon: React.ReactNode;
}

interface ToolGroup {
  labelKey: string;
  tools: ToolDef[];
}

const iconProps = { size: 14, strokeWidth: 1.8 };

const LESSON_TOOL_GROUPS: ToolGroup[] = [
  {
    labelKey: "sidebar.studyGroup",
    tools: [
      { id: "plan", labelKey: "mode.plan", icon: <ClipboardList {...iconProps} /> },
      { id: "lecturer-note", labelKey: "mode.lecturerNote", icon: <FileText {...iconProps} /> },
      { id: "deep-dive", labelKey: "mode.deepDive", icon: <MessageSquare {...iconProps} /> },
      { id: "mindmap", labelKey: "mode.mindmap", icon: <Network {...iconProps} /> },
    ],
  },
  {
    labelKey: "sidebar.analysisGroup",
    tools: [
      { id: "alignment", labelKey: "mode.alignment", icon: <Target {...iconProps} /> },
      { id: "deviation", labelKey: "mode.deviation", icon: <GitCompare {...iconProps} /> },
      { id: "lo-study", labelKey: "mode.loStudy", icon: <GraduationCap {...iconProps} /> },
      { id: "lo-progress", labelKey: "mode.loProgress", icon: <CheckCircle {...iconProps} /> },
    ],
  },
  {
    labelKey: "sidebar.practiceGroup",
    tools: [
      { id: "quiz", labelKey: "mode.quiz", icon: <HelpCircle {...iconProps} /> },
      { id: "adaptive-quiz", labelKey: "mode.adaptiveQuiz", icon: <Layers {...iconProps} /> },
      { id: "flashcards", labelKey: "mode.flashcards", icon: <CreditCard {...iconProps} /> },
    ],
  },
  {
    labelKey: "sidebar.resourcesGroup",
    tools: [
      { id: "cheat-sheet", labelKey: "mode.cheatSheet", icon: <Zap {...iconProps} /> },
      { id: "notes", labelKey: "mode.myNotes", icon: <PenLine {...iconProps} /> },
      { id: "connections", labelKey: "mode.connections", icon: <Share2 {...iconProps} /> },
      { id: "knowledge-graph", labelKey: "mode.knowledgeGraph", icon: <Network {...iconProps} /> },
    ],
  },
];

/* ─── Sidebar component ─── */

interface AppSidebarProps {
  onOpenUpload: () => void;
}

export default function AppSidebar({ onOpenUpload }: AppSidebarProps) {
  const { mode, setMode, leftPanelCollapsed: collapsed, toggleLeftPanel, setShowCreateCourseModal } = useUiStore();
  const { lessons, currentLessonId, setCurrentLessonId } = useLessonStore();
  const { courses, currentCourseId, selectCourse } = useCourseStore();

  // Track which course is expanded in sidebar (independent from store selection)
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(currentCourseId);

  const handleDashboardClick = () => {
    setMode("course-dashboard");
    selectCourse(null);
    setExpandedCourseId(null);
  };

  const handleCourseClick = (courseId: string) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
    } else {
      setExpandedCourseId(courseId);
      selectCourse(courseId);
    }
  };

  const getLessonsForCourse = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return [];
    return lessons.filter((l) => course.lessonIds.includes(l.id));
  };

  // Track which lesson's tools are expanded (can toggle off)
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(currentLessonId);

  const handleLessonClick = (lessonId: string, courseId: string) => {
    if (expandedLessonId === lessonId) {
      // Toggle close — collapse tools but keep lesson selected
      setExpandedLessonId(null);
      return;
    }
    setExpandedLessonId(lessonId);
    if (currentLessonId !== lessonId) {
      setCurrentLessonId(lessonId);
      selectCourse(courseId);
      if (typeof window !== "undefined") {
        localStorage.setItem("lc.lastLessonId", lessonId);
      }
    }
    setMode("plan");
  };

  return (
    <aside
      className={`app-sidebar${collapsed ? " app-sidebar--collapsed" : ""}`}
      role="navigation"
      aria-label={t("sidebar.navigation")}
    >
      {/* Header */}
      <div className="app-sidebar__header">
        <div className="app-sidebar__brand">
          <span className="app-sidebar__brand-text">AIcelerate</span>
          <div className="pill" style={{ fontSize: 9, padding: "1px 6px", opacity: 0.6 }}>v3</div>
        </div>
        <button
          className="app-sidebar__toggle"
          onClick={toggleLeftPanel}
          title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Scrollable body */}
      <div className="app-sidebar__body">
        {/* Dashboard */}
        <div className="app-sidebar__section">
          <button
            className={`app-sidebar__item${mode === "course-dashboard" ? " app-sidebar__item--active" : ""}`}
            onClick={handleDashboardClick}
            title={t("sidebar.dashboard")}
          >
            <span className="app-sidebar__icon">
              <LayoutDashboard size={18} strokeWidth={1.8} />
            </span>
            <span className="app-sidebar__label">{t("sidebar.dashboard")}</span>
          </button>

        </div>

        <div className="app-sidebar__divider" />

        {/* Courses section */}
        <div className="app-sidebar__section app-sidebar__section--courses">
          <div className="app-sidebar__section-title">{t("sidebar.courses")}</div>

          {/* + New Course */}
          <button
            className="app-sidebar__new-lesson"
            onClick={() => {
              setMode("course-dashboard");
              setShowCreateCourseModal(true);
            }}
            title={t("sidebar.newCourse")}
          >
            <Plus size={14} />
            <span>{t("sidebar.newCourse")}</span>
          </button>

          <div className="app-sidebar__course-list">
            {courses.map((course) => {
              const isExpanded = expandedCourseId === course.id;
              const courseLessons = getLessonsForCourse(course.id);

              return (
                <div key={course.id} className="app-sidebar__course">
                  {/* Course header */}
                  <button
                    className={`app-sidebar__course-btn${isExpanded ? " app-sidebar__course-btn--expanded" : ""}`}
                    onClick={() => handleCourseClick(course.id)}
                    title={`${course.code} - ${course.name}`}
                  >
                    <ChevronRight
                      size={14}
                      className={`app-sidebar__chevron${isExpanded ? " app-sidebar__chevron--open" : ""}`}
                    />
                    <span className="app-sidebar__course-code">{course.code}</span>
                    <span className="app-sidebar__course-name">{course.name}</span>
                    <span className="app-sidebar__course-count">{courseLessons.length}</span>
                  </button>

                  {/* Expanded course content */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        className="app-sidebar__course-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        {/* + New Lesson inside course */}
                        <button
                          className="app-sidebar__add-lesson"
                          onClick={() => setMode("create-lesson")}
                          title={t("sidebar.newLesson")}
                        >
                          <Plus size={12} />
                          <span>{t("sidebar.newLesson")}</span>
                        </button>

                        {/* Lessons under this course */}
                        {courseLessons.length === 0 && (
                          <div className="app-sidebar__empty-course">
                            {t("sidebar.noLessons")}
                          </div>
                        )}
                        {courseLessons.map((lesson) => {
                          const isLessonSelected = lesson.id === currentLessonId;
                          const isToolsOpen = lesson.id === expandedLessonId;
                          return (
                            <div key={lesson.id}>
                              <button
                                className={`app-sidebar__lesson-btn${isLessonSelected ? " app-sidebar__lesson-btn--active" : ""}`}
                                onClick={() => handleLessonClick(lesson.id, course.id)}
                                title={lesson.title}
                              >
                                <span className="app-sidebar__lesson-dot" />
                                <span className="app-sidebar__lesson-title">{lesson.title}</span>
                              </button>

                              {/* Tool groups — togglable */}
                              <AnimatePresence initial={false}>
                                {isToolsOpen && (
                                  <motion.div
                                    className="app-sidebar__tools"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                  >
                                    {LESSON_TOOL_GROUPS.map((group) => (
                                      <div key={group.labelKey}>
                                        <div className="app-sidebar__tool-group-label">
                                          {t(group.labelKey)}
                                        </div>
                                        {group.tools.map((tool) => (
                                          <button
                                            key={tool.id}
                                            className={`app-sidebar__tool-item${mode === tool.id ? " app-sidebar__tool-item--active" : ""}`}
                                            onClick={() => setMode(tool.id)}
                                            title={t(tool.labelKey)}
                                          >
                                            <span className="app-sidebar__tool-icon">{tool.icon}</span>
                                            {t(tool.labelKey)}
                                          </button>
                                        ))}
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {courses.length === 0 && (
              <div className="app-sidebar__empty-course" style={{ padding: "12px" }}>
                {t("sidebar.noCourses")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="app-sidebar__bottom">
        <button
          className={`app-sidebar__item${mode === "history" ? " app-sidebar__item--active" : ""}`}
          onClick={() => setMode("history")}
          title={t("sidebar.allLessons")}
        >
          <span className="app-sidebar__icon">
            <History size={18} strokeWidth={1.8} />
          </span>
          <span className="app-sidebar__label">{t("sidebar.allLessons")}</span>
        </button>
        <button
          className={`app-sidebar__item${mode === "study-hub" ? " app-sidebar__item--active" : ""}`}
          onClick={() => setMode("study-hub")}
          title={t("mode.studyHub")}
        >
          <span className="app-sidebar__icon">
            <Users size={18} strokeWidth={1.8} />
          </span>
          <span className="app-sidebar__label">{t("mode.studyHub")}</span>
        </button>
        <button
          className="app-sidebar__item"
          onClick={onOpenUpload}
          title={t("sidebar.uploadMaterials")}
        >
          <span className="app-sidebar__icon">
            <Upload size={18} strokeWidth={1.8} />
          </span>
          <span className="app-sidebar__label">{t("sidebar.uploadMaterials")}</span>
        </button>
      </div>
    </aside>
  );
}
