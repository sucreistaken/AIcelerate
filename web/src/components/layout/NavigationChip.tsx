// src/components/layout/NavigationChip.tsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCourseStore } from "../../stores/courseStore";
import { useLessonStore } from "../../stores/lessonStore";
import { useUiStore } from "../../stores/uiStore";

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

export default NavigationChip;
