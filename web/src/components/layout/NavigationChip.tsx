// src/components/layout/NavigationChip.tsx
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCourseStore } from "../../stores/courseStore";
import { useLessonStore } from "../../stores/lessonStore";
import { useUiStore } from "../../stores/uiStore";
import { t } from "../../utils/i18n";

function NavigationChip() {
  // Per-field selectors so this chip doesn't re-render on unrelated store
  // mutations (theme toggles, stt progress ticks, dashboard revalidations).
  const courses = useCourseStore((s) => s.courses);
  const currentCourseId = useCourseStore((s) => s.currentCourseId);
  const selectCourse = useCourseStore((s) => s.selectCourse);
  const lessons = useLessonStore((s) => s.lessons);
  const currentLessonId = useLessonStore((s) => s.currentLessonId);
  const setCurrentLessonId = useLessonStore((s) => s.setCurrentLessonId);
  const clearCurrentLesson = useLessonStore((s) => s.clearCurrentLesson);
  const draftTitle = useUiStore((s) => s.draftTitle);
  const setDraftTitle = useUiStore((s) => s.setDraftTitle);
  const setShowNewLessonModal = useUiStore((s) => s.setShowNewLessonModal);
  const [open, setOpen] = useState(false);

  const currentCourse = useMemo(
    () => courses.find((c) => c.id === currentCourseId) ?? null,
    [courses, currentCourseId]
  );
  const currentLesson = useMemo(
    () => lessons.find((l) => l.id === currentLessonId) ?? null,
    [lessons, currentLessonId]
  );

  const courseLabel = currentCourse ? currentCourse.code : t("nav.allCourses");
  const lessonLabel = currentLesson ? currentLesson.title : t("nav.noLesson");

  const { filteredLessons, otherLessons } = useMemo(() => {
    if (!currentCourse) return { filteredLessons: lessons, otherLessons: [] };
    const assignedIds = new Set(currentCourse.lessonIds);
    return {
      filteredLessons: lessons.filter((l) => assignedIds.has(l.id)),
      otherLessons: lessons.filter((l) => !assignedIds.has(l.id)),
    };
  }, [currentCourse, lessons]);

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
              value={currentCourseId || ""}
              onChange={(e) => selectCourse(e.target.value || null)}
            >
              <option value="">{t("nav.selectCourse")}</option>
              {courses.map((c) => (
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
              value={currentLessonId ?? (draftTitle ? "__draft__" : "")}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__new__") {
                  clearCurrentLesson();
                  setDraftTitle("");
                  setShowNewLessonModal(true);
                  return;
                }
                if (val === "__draft__") return;
                setCurrentLessonId(val === "" ? null : val);
                if (val) localStorage.setItem("lc.lastLessonId", val);
                else localStorage.removeItem("lc.lastLessonId");
              }}
            >
              <option value="">{t("nav.selectLesson")}</option>
              <option value="__new__" className="fw-700">{t("nav.createNewLesson")}</option>
              {draftTitle && <option value="__draft__">Draft: {draftTitle}</option>}
              {filteredLessons.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
              {otherLessons.length > 0 && (
                <optgroup label={t("nav.otherLessons")}>
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

export default NavigationChip;
