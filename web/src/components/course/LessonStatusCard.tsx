import React from "react";

export interface LessonStatusData {
  id: string;
  title: string;
  date: string;
  hasSlides: boolean;
  hasTranscript: boolean;
  hasPlan: boolean;
  hasQuiz: boolean;
}

interface Props {
  lesson: LessonStatusData;
  weekIndex: number;
  onGoToLesson: (id: string) => void;
  onRemove: (lessonId: string) => void;
  courseId: string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function getStatus(l: LessonStatusData): { label: string; color: string; borderColor: string; bg: string } {
  if (l.hasPlan && (l.hasSlides || l.hasTranscript)) {
    return { label: "✓ Tamamlandı", color: "var(--success)", borderColor: "var(--success)", bg: "var(--success-soft)" };
  }
  if (l.hasSlides || l.hasTranscript) {
    return { label: "⏳ Materyaller eksik", color: "var(--warning)", borderColor: "var(--warning)", bg: "var(--warning-soft)" };
  }
  return { label: "📭 Boş", color: "var(--muted)", borderColor: "var(--border)", bg: "transparent" };
}

function Badge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      style={{
        padding: "2px 7px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 500,
        background: active ? "var(--success-soft)" : "var(--card-hover, #f4f4f6)",
        color: active ? "var(--success)" : "var(--muted)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default function LessonStatusCard({
  lesson, weekIndex, onGoToLesson, onRemove,
  isSelectionMode = false, isSelected = false, onToggleSelect,
}: Props) {
  const status = getStatus(lesson);

  const handleClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(lesson.id);
    } else {
      onGoToLesson(lesson.id);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: "12px 16px",
        borderLeft: `3px solid ${isSelected ? "var(--accent-2, #7c3aed)" : status.borderColor}`,
        background: isSelected ? "var(--accent-2-soft)" : status.bg,
        cursor: "pointer",
        transition: "all 0.2s ease",
        outline: isSelected ? "1px solid var(--accent-2)" : "none",
      }}
      onClick={handleClick}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isSelectionMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(lesson.id)}
              onClick={(e) => e.stopPropagation()}
              style={{ accentColor: "var(--accent-2, #7c3aed)", width: 16, height: 16, cursor: "pointer" }}
            />
          )}
          <span style={{
            fontWeight: 700,
            fontSize: 12,
            color: status.color,
            background: `${status.borderColor}20`,
            padding: "2px 8px",
            borderRadius: 6,
          }}>
            W{weekIndex + 1}
          </span>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{lesson.title}</span>
        </div>
        <span style={{ fontSize: 11, color: status.color }}>{status.label}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <Badge label="📄 Slayt" active={lesson.hasSlides} />
          <Badge label="🎙️ Transkript" active={lesson.hasTranscript} />
          <Badge label="📝 Plan" active={lesson.hasPlan} />
          <Badge label="❓ Quiz" active={lesson.hasQuiz} />
        </div>
        {!isSelectionMode && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: "2px 6px", color: "var(--muted)" }}
            onClick={(e) => { e.stopPropagation(); onRemove(lesson.id); }}
            title="Kurstan çıkar"
          >
            Çıkar
          </button>
        )}
      </div>
    </div>
  );
}
