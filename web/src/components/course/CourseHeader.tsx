import type { Course } from "../../types";

interface CourseHeaderProps {
  course: Course;
  onBack: () => void;
  onExport: () => void;
  onRebuild: () => void;
  onDelete: () => void;
}

export function CourseHeader({ course, onBack, onExport, onRebuild, onDelete }: CourseHeaderProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
      <div>
        <button className="btn btn-ghost" style={{ marginBottom: 8, padding: "2px 8px", fontSize: 12 }} onClick={onBack}>
          &larr; All Courses
        </button>
        <h2 className="h2" style={{ marginBottom: 4 }}>
          <span style={{ color: "var(--accent-2)" }}>{course.code}</span> {course.name}
        </h2>
        {course.description && <p className="muted small">{course.description}</p>}
        {course.settings?.examDate && (
          <div className="small" style={{ marginTop: 4, color: "var(--accent-2)" }}>Exam: {course.settings.examDate}</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-ghost" onClick={onExport} title="Export course data">
          Export
        </button>
        <button className="btn btn-ghost" onClick={onRebuild} title="Rebuild Knowledge Index">
          Rebuild Index
        </button>
        <button
          className="btn btn-ghost"
          style={{ color: "var(--danger, #ef4444)" }}
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
