import { useMemo } from "react";
import { ConceptConnection } from "../../types";
import { useConnectionsStore } from "../../stores/connectionsStore";

interface FilterToolbarProps {
  connections: ConceptConnection[];
}

export default function FilterToolbar({ connections }: FilterToolbarProps) {
  const {
    searchQuery, setSearchQuery,
    minStrength, setMinStrength,
    selectedLessonFilter, setLessonFilter,
    sortMode, setSortMode,
  } = useConnectionsStore();

  const uniqueLessons = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of connections) {
      c.lessonIds.forEach((id, i) => {
        if (!map.has(id)) map.set(id, c.lessonTitles[i] || id);
      });
    }
    return Array.from(map.entries());
  }, [connections]);

  return (
    <div className="conn-toolbar">
      <input
        type="text"
        className="conn-search-input"
        placeholder="Search concepts..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className="conn-toolbar__group">
        <label className="conn-toolbar__label">
          Min: {Math.round(minStrength * 100)}%
        </label>
        <input
          type="range"
          className="conn-strength-slider"
          min={0}
          max={100}
          value={Math.round(minStrength * 100)}
          onChange={(e) => setMinStrength(Number(e.target.value) / 100)}
        />
      </div>
      <select
        className="conn-search-input"
        value={selectedLessonFilter || ""}
        onChange={(e) => setLessonFilter(e.target.value || null)}
        style={{ maxWidth: 180 }}
      >
        <option value="">All Lessons</option>
        {uniqueLessons.map(([id, title]) => (
          <option key={id} value={id}>
            {title.length > 30 ? title.slice(0, 30) + "..." : title}
          </option>
        ))}
      </select>
      <div className="view-toggle" style={{ marginLeft: "auto" }}>
        {(["strength", "alpha", "lesson-count"] as const).map((mode) => (
          <button
            key={mode}
            className={`view-toggle__btn${sortMode === mode ? " view-toggle__btn--active" : ""}`}
            onClick={() => setSortMode(mode)}
          >
            {mode === "strength" ? "Strength" : mode === "alpha" ? "A-Z" : "# Lessons"}
          </button>
        ))}
      </div>
    </div>
  );
}
