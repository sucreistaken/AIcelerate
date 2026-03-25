import LessonCard from "./LessonCard";

interface Props {
  group: { courseId: string; code: string; name: string; lessons: any[] };
  isCollapsed: boolean;
  onToggleCollapse: (courseId: string) => void;
  currentLessonId: string | null;
  selectedIds: Set<string>;
  t: Record<string, string>;
  onSelectLesson: (id: string) => void;
  toggleSelect: (id: string) => void;
  setDeleteTarget: (target: { id: string; title: string }) => void;
  formatDate: (d?: string, locale?: string) => string;
}

export default function CourseGroup({
  group, isCollapsed, onToggleCollapse,
  currentLessonId, selectedIds, t,
  onSelectLesson, toggleSelect, setDeleteTarget, formatDate,
}: Props) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        className="lh-course-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          cursor: "pointer",
          borderRadius: 8,
          background: "var(--card-hover)",
          marginBottom: 6,
        }}
        onClick={() => onToggleCollapse(group.courseId)}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="currentColor"
          style={{
            transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <path d="M4 4l4 4-4 4" />
        </svg>
        <span style={{ fontWeight: 600, color: "var(--accent-2)", fontSize: 13 }}>{group.code}</span>
        <span style={{ fontWeight: 500, fontSize: 13 }}>{group.name}</span>
        <span className="muted small" style={{ marginLeft: "auto" }}>{group.lessons.length}</span>
      </div>
      {!isCollapsed && group.lessons.map((l: any) => (
        <LessonCard
          key={l.id}
          lesson={l}
          isActive={l.id === currentLessonId}
          isSelected={selectedIds.has(l.id)}
          t={t}
          onSelect={onSelectLesson}
          onToggleCheck={toggleSelect}
          onDeleteClick={(id, title) => setDeleteTarget({ id, title })}
          formatDate={formatDate}
        />
      ))}
    </div>
  );
}
