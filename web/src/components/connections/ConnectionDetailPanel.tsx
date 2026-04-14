import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ConceptConnection } from "../../types";
import { useConnectionsStore } from "../../stores/connectionsStore";
import { useLessonStore } from "../../stores/lessonStore";
import { useUiStore } from "../../stores/uiStore";
import { strengthClass } from "./helpers";
import { TypingIndicator } from "../ui";

interface ConnectionDetailPanelProps {
  connection: ConceptConnection;
  onClose: () => void;
}

export default function ConnectionDetailPanel({ connection, onClose }: ConnectionDetailPanelProps) {
  const deepDiveResult = useConnectionsStore((s) => s.deepDiveResult);
  const deepDiveLoading = useConnectionsStore((s) => s.deepDiveLoading);
  const deepDiveError = useConnectionsStore((s) => s.deepDiveError);
  const deepDiveConcept = useConnectionsStore((s) => s.deepDiveConcept);
  const setSelectedConcept = useConnectionsStore((s) => s.setSelectedConcept);
  const clearDeepDive = useConnectionsStore((s) => s.clearDeepDive);
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

  // Abort streams when this panel unmounts (e.g. user closes it mid-stream).
  // The store's clearDeepDive abort()s the AbortController for us.
  useEffect(() => {
    return () => {
      clearDeepDive();
    };
  }, [clearDeepDive]);

  // Derived UI states
  const isStreamingWithContent = deepDiveLoading && !!deepDiveResult && deepDiveResult.length > 0;
  const isAwaitingFirstChunk = deepDiveLoading && (!deepDiveResult || deepDiveResult.length === 0);
  const isDone = !deepDiveLoading && !!deepDiveResult && !deepDiveError;

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

          {/* Phase 1: waiting for first chunk — show typing indicator with an Analyzing... label */}
          {isAwaitingFirstChunk && (
            <div style={{ marginTop: 12 }}>
              <TypingIndicator label="Analyzing concept..." />
            </div>
          )}

          {/* Phase 2: streaming with partial content — show what's arrived so far + a blinking cursor */}
          {isStreamingWithContent && (
            <div className="conn-detail-panel__deepdive" aria-live="polite">
              {deepDiveResult!.split("\n").map((p, i, arr) => {
                if (!p.trim()) return null;
                const isLast = i === arr.length - 1;
                return (
                  <p key={i}>
                    {p}
                    {isLast && (
                      <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.9 }}
                        style={{
                          display: "inline-block",
                          width: 2,
                          height: "1em",
                          background: "var(--accent-2)",
                          marginLeft: 2,
                          verticalAlign: "text-bottom",
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </p>
                );
              })}
            </div>
          )}

          {/* Phase 3: done — plain formatted output */}
          {isDone && (
            <div className="conn-detail-panel__deepdive">
              {deepDiveResult!.split("\n").map((p, i) =>
                p.trim() ? <p key={i}>{p}</p> : null
              )}
            </div>
          )}

          {/* Phase 4: error — show the message + any partial text we already got */}
          {deepDiveError && (
            <div
              role="alert"
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 8,
                background: "var(--danger-bg, rgba(239, 68, 68, 0.08))",
                color: "var(--danger, #ef4444)",
                fontSize: 13,
              }}
            >
              Deep dive failed: {deepDiveError}
              {deepDiveResult && deepDiveResult.length > 0 && (
                <div className="conn-detail-panel__deepdive" style={{ marginTop: 8 }}>
                  {deepDiveResult.split("\n").map((p, i) =>
                    p.trim() ? <p key={i}>{p}</p> : null
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
