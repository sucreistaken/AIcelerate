import type { Course } from "../../types";
import { CreateCourseModal } from "./CreateCourseModal";
import PaneInfoBanner from "../ui/PaneInfoBanner";

interface CourseListViewProps {
  courses: Course[];
  showCreateModal: boolean;
  onShowCreateModal: (show: boolean) => void;
  onSelectCourse: (id: string) => void;
}

export function CourseListView({ courses, showCreateModal, onShowCreateModal, onSelectCourse }: CourseListViewProps) {
  return (
    <div className="lc-section" style={{ padding: 24 }}>
      <PaneInfoBanner
        id="course-dashboard"
        title="Course Dashboard Nedir?"
        description="Derslerinizi kurslara gruplayarak AI'\ın dersler aras\ı ba\ğlant\ı kurmas\ın\ı sa\ğlay\ın."
        tips={["Kurs olu\ştur", "Ders ata", "\İlerleme takibi", "Haftal\ık plan"]}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="h2">Courses</h2>
        <button className="btn btn-primary" onClick={() => onShowCreateModal(true)}>+ New Course</button>
      </div>

      {courses.length === 0 ? (
        <div className="muted-block" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>No courses yet. Create a course to organize your lessons.</p>
          <p className="muted small">Courses group your lessons together so the AI can make cross-lesson connections.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {courses.map((c) => (
            <div
              key={c.id}
              className="card"
              style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onClick={() => onSelectCourse(c.id)}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  <span style={{ color: "var(--accent-2)", marginRight: 8 }}>{c.code}</span>
                  {c.name}
                </div>
                <div className="muted small">
                  {c.lessonIds.length} lesson{c.lessonIds.length !== 1 ? "s" : ""}
                  {c.settings?.examDate ? ` | Exam: ${c.settings.examDate}` : ""}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity={0.4}>
                <path d="M6 3l5 5-5 5" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && <CreateCourseModal onClose={() => onShowCreateModal(false)} />}
    </div>
  );
}
