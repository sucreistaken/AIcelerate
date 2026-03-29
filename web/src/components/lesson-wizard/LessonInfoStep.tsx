import React, { useState } from "react";
import type { Course } from "../../types";
import { t } from "../../utils/i18n";

interface Props {
  title: string;
  weekNumber: string;
  courses: Course[];
  selectedCourseId: string | null;
  isCreating: boolean;
  error: string | null;
  canProceed: boolean;
  onTitleChange: (v: string) => void;
  onWeekChange: (v: string) => void;
  onCourseChange: (id: string | null) => void;
  onCourseCreated: (course: Course) => void;
  onNext: () => void;
}

export default function LessonInfoStep({
  title, weekNumber, courses, selectedCourseId, isCreating, error, canProceed,
  onTitleChange, onWeekChange, onCourseChange, onCourseCreated, onNext,
}: Props) {
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  const handleCreateCourse = async () => {
    if (!newCourseName.trim() || !newCourseCode.trim()) return;
    setCreatingCourse(true);
    try {
      const { useCourseStore } = await import("../../stores/courseStore");
      const store = useCourseStore.getState();
      const course = await store.createCourse(newCourseCode.trim(), newCourseName.trim());
      if (course) {
        onCourseCreated(course);
        onCourseChange(course.id);
        setShowNewCourse(false);
        setNewCourseName("");
        setNewCourseCode("");
      }
    } catch { /* ignore */ }
    setCreatingCourse(false);
  };

  return (
    <form onSubmit={handleSubmit} className="wizard-step-card">
      <h3 className="wizard-step-card__title">{t("wizard.lessonInfoTitle")}</h3>
      <p className="wizard-step-card__desc">
        {t("wizard.lessonInfoDesc2")}
      </p>

      {/* Kurs Secimi */}
      <div className="wizard-field">
        <label className="wizard-field__label">
          {t("wizard.courseLabel")}
        </label>
        {!showNewCourse ? (
          <>
            <select
              className="input"
              style={{ width: "100%", padding: "10px 14px" }}
              value={selectedCourseId || ""}
              onChange={(e) => onCourseChange(e.target.value || null)}
            >
              <option value="">{t("wizard.selectCourse2")}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12, marginTop: 8, padding: "4px 8px" }}
              onClick={() => setShowNewCourse(true)}
            >
              {t("wizard.createNewCourse2")}
            </button>
          </>
        ) : (
          <div className="card" style={{ padding: 16, display: "grid", gap: 10, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{t("wizard.newCourse")}</div>
            <input
              className="input"
              style={{ width: "100%" }}
              placeholder={t("wizard.courseCodePh")}
              value={newCourseCode}
              onChange={(e) => setNewCourseCode(e.target.value)}
              autoFocus
            />
            <input
              className="input"
              style={{ width: "100%" }}
              placeholder={t("wizard.courseNamePh")}
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: 12, flex: 1 }}
                disabled={!newCourseName.trim() || !newCourseCode.trim() || creatingCourse}
                onClick={handleCreateCourse}
              >
                {creatingCourse ? t("wizard.creating") : t("wizard.create")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => setShowNewCourse(false)}
              >
                {t("wizard.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Course Badge */}
      {selectedCourseId && !showNewCourse && (() => {
        const course = courses.find((c) => c.id === selectedCourseId);
        return course ? (
          <div className="wizard-course-badge">
            <span className="wizard-course-badge__icon">📚</span>
            <div>
              <div className="wizard-course-badge__code">{course.code}</div>
              <div className="wizard-course-badge__name">{course.name}</div>
            </div>
          </div>
        ) : null;
      })()}

      <div className="wizard-field">
        <label className="wizard-field__label">
          {t("wizard.titleLabel")}
        </label>
        <input
          className="input"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t("wizard.titlePlaceholder")}
          style={{ width: "100%", padding: "10px 14px" }}
        />
      </div>

      <div className="wizard-field">
        <label className="wizard-field__label">
          {t("wizard.weekNumberLabel")} <span className="wizard-field__label--optional">{t("wizard.optional")}</span>
        </label>
        <input
          className="input"
          type="number"
          min={1}
          max={20}
          value={weekNumber}
          onChange={(e) => onWeekChange(e.target.value)}
          placeholder={t("wizard.weekPlaceholder")}
          style={{ width: 130, padding: "10px 14px" }}
        />
        <p className="wizard-field__hint">
          {t("wizard.weekNoteHint")}
        </p>
      </div>

      {error && (
        <div className="wizard-error">
          {error}
        </div>
      )}

      <div className="wizard-actions">
        <div />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!canProceed || isCreating}
        >
          {isCreating ? t("wizard.creating") : t("wizard.next")}
        </button>
      </div>
    </form>
  );
}
