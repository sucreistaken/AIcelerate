import { useCallback } from "react";
import { motion } from "framer-motion";
import { ConceptConnection } from "../../types";
import { useConnectionsStore } from "../../stores/connectionsStore";
import { useLessonStore } from "../../stores/lessonStore";
import { useUiStore } from "../../stores/uiStore";
import { strengthClass } from "./helpers";

interface ConnectionDetailPanelProps {
  connection: ConceptConnection;
  onClose: () => void;
}

export default function ConnectionDetailPanel({ connection, onClose }: ConnectionDetailPanelProps) {
  const { deepDiveResult, deepDiveLoading, deepDiveConcept, setSelectedConcept } = useConnectionsStore();
  const setCurrentLessonId = useLessonStore((s) => s.setCurrentLessonId);
  const setMode = useUiStore((s) => s.setMode);
  const allLessons = useLessonStore((s) => s.lessons);

  const handleLessonClick = useCallback((title: string) => {
    const lesson = allLessons.find((l) => l.title === title);
    if (lesson) {
      setCurrentLessonId(lesson.id);
      setMode("plan");
    }
  }, [allLessons, setCurrentLessonId, setMode]);

  const handleDeepDive = useCallback(() => {
    deepDiveConcept(connection.concept, connection.lessonTitles, connection.relatedConcepts);
  }, [deepDiveConcept, connection]);

  return (
    <>
      <motion.div
        className="conn-detail-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="conn-detail-panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        <div className="conn-detail-panel__header">
          <div>
            <h3 className="conn-detail-panel__title">{connection.concept}</h3>
            <span className={`conn-strength ${strengthClass(connection.strength)}`}>
              {Math.round(connection.strength * 100)}% strength
            </span>
          </div>
          <button className="btn btn--sm" onClick={onClose} aria-label="Close">
            &#x2715;
          </button>
        </div>

        {connection.aiInsight && (
          <div className="conn-detail-panel__section">
            <h4 className="conn-detail-panel__section-title">AI Insight</h4>
            <div className="conn-insight">{connection.aiInsight}</div>
          </div>
        )}

        <div className="conn-detail-panel__section">
          <h4 className="conn-detail-panel__section-title">
            Appears in {connection.lessonTitles.length} lesson(s)
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {connection.lessonTitles.map((title, i) => (
              <button
                key={i}
                className="conn-lesson-tag"
                onClick={() => handleLessonClick(title)}
                style={{ cursor: "pointer", textAlign: "left", display: "block", maxWidth: "100%" }}
              >
                {title}
              </button>
            ))}
          </div>
        </div>

        {connection.relatedConcepts.length > 0 && (
          <div className="conn-detail-panel__section">
            <h4 className="conn-detail-panel__section-title">Related Concepts</h4>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {connection.relatedConcepts.map((rc, i) => (
                <button
                  key={i}
                  className="conn-lesson-tag"
                  onClick={() => setSelectedConcept(rc)}
                  style={{ cursor: "pointer" }}
                >
                  {rc}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="conn-detail-panel__section">
          <button
            className="btn"
            onClick={handleDeepDive}
            disabled={deepDiveLoading}
          >
            {deepDiveLoading ? "Analyzing..." : "Deep Dive"}
          </button>

          {deepDiveLoading && (
            <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 13 }}>
              Generating in-depth analysis...
            </div>
          )}

          {deepDiveResult && !deepDiveLoading && (
            <div className="conn-detail-panel__deepdive">
              {deepDiveResult.split("\n").map((p, i) =>
                p.trim() ? <p key={i}>{p}</p> : null
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
