import { useState } from "react";
import toast from "react-hot-toast";
import { useLessonStore } from "../../stores/lessonStore";
import { useCourseStore } from "../../stores/courseStore";
import type { Course } from "../../types";

export function AssignLessonModal({ course, onClose, lang = 'tr' }: { course: Course; onClose: () => void; lang?: 'tr' | 'en' }) {
  const lessons = useLessonStore((s) => s.lessons);
  const addLesson = useCourseStore((s) => s.addLessonToCourse);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const unassigned = lessons.filter((l) => !course.lessonIds.includes(l.id));

  const t = lang === 'tr' ? {
    title: `${course.code} kursuna ders ekle`,
    allAssigned: "Tüm dersler zaten bu kursa atanmış.",
    close: "Kapat",
    adding: "Ekleniyor...",
    success: "Ders kursa eklendi",
  } : {
    title: `Add Lesson to ${course.code}`,
    allAssigned: "All lessons are already assigned to this course.",
    close: "Close",
    adding: "Adding...",
    success: "Lesson added to course",
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-title h3 mb-4">{t.title}</div>
        {unassigned.length === 0 ? (
          <p className="muted">{t.allAssigned}</p>
        ) : (
          <div style={{ display: "grid", gap: 6, maxHeight: 300, overflowY: "auto" }}>
            {unassigned.map((l) => (
              <button
                key={l.id}
                className="btn btn-ghost"
                style={{ textAlign: "left", justifyContent: "flex-start" }}
                disabled={loadingId !== null}
                onClick={async () => {
                  setLoadingId(l.id);
                  await addLesson(course.id, l.id);
                  toast.success(t.success);
                  setLoadingId(null);
                  onClose();
                }}
              >
                {loadingId === l.id ? t.adding : l.title}
              </button>
            ))}
          </div>
        )}
        <div className="modal-actions flex justify-end gap-2 mt-4">
          <button className="btn btn-secondary" onClick={onClose} disabled={loadingId !== null}>{t.close}</button>
        </div>
      </div>
    </div>
  );
}
