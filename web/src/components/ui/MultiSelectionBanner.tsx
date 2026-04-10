import { useStudySelectionStore } from "../../stores/studySelectionStore";
import { useLessonStore } from "../../stores/lessonStore";
import { useUiStore } from "../../stores/uiStore";

export default function MultiSelectionBanner() {
  const { selectedLessonIds, isSelectionMode, exitSelectionMode } = useStudySelectionStore();
  const lessons = useLessonStore((s) => s.lessons);
  const setMode = useUiStore((s) => s.setMode);
  const mode = useUiStore((s) => s.mode);

  if (!isSelectionMode || selectedLessonIds.length === 0) return null;
  if (mode === "dashboard" || mode === "create-lesson") return null;

  const selectedTitles = selectedLessonIds
    .map((id) => lessons.find((l) => l.id === id)?.title)
    .filter(Boolean);

  return (
    <div
      style={{
        background: "var(--accent-2-soft)",
        border: "1px solid var(--accent-2)",
        borderRadius: 10,
        padding: "8px 14px",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-2)" }}>
          {selectedLessonIds.length} ders seçili
        </span>
        {selectedTitles.slice(0, 3).map((t, i) => (
          <span
            key={i}
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 6,
              background: "var(--ring)",
              color: "var(--accent-2)",
            }}
          >
            {t && t.length > 25 ? t.slice(0, 25) + "..." : t}
          </span>
        ))}
        {selectedTitles.length > 3 && (
          <span className="muted" style={{ fontSize: 10 }}>+{selectedTitles.length - 3}</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: "2px 8px" }}
          onClick={() => setMode("dashboard")}
        >
          Seçimi Değiştir
        </button>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: "2px 6px", color: "var(--muted)" }}
          onClick={exitSelectionMode}
          title="Seçimi kapat"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
