import React from "react";
import { useCourseStore } from "../../stores/courseStore";
import { useLessonStore } from "../../stores/lessonStore";
import { useUiStore } from "../../stores/uiStore";
import NotificationBell from "../ui/NotificationBell";
import ThemeToggle from "../ui/ThemeToggle";
import { Settings } from "lucide-react";
import { t } from "../../utils/i18n";

interface AppNavbarProps {
  language: "tr" | "en";
  onToggleLanguage: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}

function NavBreadcrumb() {
  // Per-field selectors — navbar is mounted app-wide; skip re-renders on
  // unrelated ui/lesson/course mutations.
  const courses = useCourseStore((s) => s.courses);
  const currentCourseId = useCourseStore((s) => s.currentCourseId);
  const lessons = useLessonStore((s) => s.lessons);
  const currentLessonId = useLessonStore((s) => s.currentLessonId);
  const mode = useUiStore((s) => s.mode);

  const course = courses.find((c) => c.id === currentCourseId);
  const lesson = lessons.find((l) => l.id === currentLessonId);

  const modeName = mode
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="nav-breadcrumb">
      {course && (
        <>
          <span className="nav-breadcrumb__item" style={{ color: "var(--accent-2)" }}>
            {course.code}
          </span>
          <span className="nav-breadcrumb__sep">/</span>
        </>
      )}
      {lesson && (
        <>
          <span className="nav-breadcrumb__item">{lesson.title}</span>
          <span className="nav-breadcrumb__sep">/</span>
        </>
      )}
      <span className="nav-breadcrumb__item nav-breadcrumb__item--muted">
        {modeName}
      </span>
    </div>
  );
}

export default function AppNavbar({ language, onToggleLanguage, onOpenSettings }: AppNavbarProps) {
  return (
    <nav className="nav" role="navigation" aria-label="Ana navigasyon">
      <div className="nav-inner">
        <NavBreadcrumb />
        <div className="flex-1" />
        <div className="nav-actions">
          <NotificationBell />
          <button className="nav-icon-btn" onClick={onOpenSettings} title={t("nav.settings")} aria-label={t("nav.settings")}>
            <Settings size={16} strokeWidth={1.8} />
          </button>
          <button className="nav-lang-btn" onClick={onToggleLanguage} title={language === "tr" ? t("nav.switchToEn") : t("nav.switchToTr")} aria-label={language === "tr" ? t("nav.switchToEn") : t("nav.switchToTr")}>
            {language === "tr" ? "TR" : "EN"}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
