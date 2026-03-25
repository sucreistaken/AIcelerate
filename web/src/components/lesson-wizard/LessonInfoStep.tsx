import React, { useState } from "react";
import type { Course } from "../../types";

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
      // Import courseStore dynamically to create course
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
    <form onSubmit={handleSubmit} style={{ maxWidth: 480, margin: "0 auto" }}>
      <h3 className="h3" style={{ marginBottom: 4 }}>Ders Bilgileri</h3>
      <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
        Yeni dersinizin temel bilgilerini girin
      </p>

      {/* Kurs Seçimi (Zorunlu) */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 13 }}>
          Kurs *
        </label>
        {!showNewCourse ? (
          <>
            <select
              className="input"
              style={{ width: "100%", padding: "8px 12px" }}
              value={selectedCourseId || ""}
              onChange={(e) => onCourseChange(e.target.value || null)}
            >
              <option value="">Kurs seçin...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12, marginTop: 6, padding: "4px 8px" }}
              onClick={() => setShowNewCourse(true)}
            >
              + Yeni Kurs Oluştur
            </button>
          </>
        ) : (
          <div className="card" style={{ padding: 14, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Yeni Kurs</div>
            <input
              className="input"
              style={{ width: "100%" }}
              placeholder="Kurs kodu (ör: MATH 101)"
              value={newCourseCode}
              onChange={(e) => setNewCourseCode(e.target.value)}
              autoFocus
            />
            <input
              className="input"
              style={{ width: "100%" }}
              placeholder="Kurs adı (ör: Matematik I)"
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
                {creatingCourse ? "Oluşturuluyor..." : "Oluştur"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => setShowNewCourse(false)}
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Seçili Kurs Badge */}
      {selectedCourseId && !showNewCourse && (() => {
        const course = courses.find((c) => c.id === selectedCourseId);
        return course ? (
          <div className="card" style={{ padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, background: "var(--success-soft)" }}>
            <span style={{ fontSize: 18 }}>📚</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{course.code}</div>
              <div className="muted" style={{ fontSize: 11 }}>{course.name}</div>
            </div>
          </div>
        ) : null;
      })()}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 13 }}>
          Ders Başlığı *
        </label>
        <input
          className="input"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Ör: Introduction to Trees"
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 13 }}>
          Hafta Numarası <span className="muted">(opsiyonel)</span>
        </label>
        <input
          className="input"
          type="number"
          min={1}
          max={20}
          value={weekNumber}
          onChange={(e) => onWeekChange(e.target.value)}
          placeholder="Ör: 3"
          style={{ width: 120 }}
        />
        <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
          Başlığa "Week X - " öneki eklenir
        </p>
      </div>

      {error && (
        <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!canProceed || isCreating}
        >
          {isCreating ? "Oluşturuluyor..." : "İleri →"}
        </button>
      </div>
    </form>
  );
}
