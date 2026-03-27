import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Course } from "../../types";
import LessonStatusCard, { type LessonStatusData } from "./LessonStatusCard";
import { t } from "../../utils/i18n";

function CoverageBadge({ level }: { level: "full" | "partial" | "none" }) {
  const colors: Record<string, string> = {
    full: "var(--success, #22c55e)",
    partial: "var(--warning, #eab308)",
    none: "var(--danger, #ef4444)",
  };
  return (
    <span
      style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: colors[level], marginRight: 6 }}
      title={level}
    />
  );
}

interface OverviewTabProps {
  course: Course;
  courseLessons: LessonStatusData[];
  onAddLesson: () => void;
  onCreateLesson: () => void;
  onRemoveLesson: (courseId: string, lessonId: string) => void;
  onGoToLesson: (lessonId: string) => void;
  // Selection props
  isSelectionMode: boolean;
  selectedLessonIds: string[];
  onEnterSelectionMode: () => void;
  onExitSelectionMode: () => void;
  onToggleLesson: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onStudySelected: () => void;
}

function OverviewTabInner({
  course, courseLessons, onAddLesson, onCreateLesson, onRemoveLesson, onGoToLesson,
  isSelectionMode, selectedLessonIds, onEnterSelectionMode, onExitSelectionMode,
  onToggleLesson, onSelectAll, onClearAll, onStudySelected,
}: OverviewTabProps) {
  const ki = course.knowledgeIndex;
  const [showActions, setShowActions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showActions) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowActions(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showActions]);

  const selectionCount = selectedLessonIds.length;

  return (
    <>
      {ki && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 20 }}>
          {[
            { value: ki.overview.totalLessons, label: t("course.stat.lessons") },
            { value: ki.progressSnapshot.completedLessons, label: t("course.stat.completed") },
            { value: ki.progressSnapshot.quizAverageScore > 0 ? `${Math.round(ki.progressSnapshot.quizAverageScore * 100)}%` : "-", label: t("course.stat.quizAvg") },
            { value: ki.progressSnapshot.flashcardsDue, label: t("course.stat.pendingCards") },
            { value: ki.progressSnapshot.weakTopics.length, label: t("course.stat.weakTopics") },
          ].map((stat, i) => (
            <div key={i} className="card" style={{ padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stat.value}</div>
              <div className="muted small">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 className="h3">{t("course.lessonsTitle")}</h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* Selection toggle */}
            {courseLessons.length > 0 && (
              <button
                className={`btn ${isSelectionMode ? "btn-ghost" : "btn-ghost"}`}
                style={{ fontSize: 12 }}
                onClick={isSelectionMode ? onExitSelectionMode : onEnterSelectionMode}
              >
                {isSelectionMode ? t("course.cancelSelection") : t("course.selectMode")}
              </button>
            )}
            {/* Add lesson dropdown */}
            {!isSelectionMode && (
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 12 }}
                  onClick={() => setShowActions(!showActions)}
                >
                  {t("course.addLesson")}
                </button>
                {showActions && (
                  <div
                    style={{
                      position: "absolute", right: 0, top: "100%", marginTop: 4,
                      background: "var(--bg-elevated)", border: "1px solid var(--border)",
                      borderRadius: 8, boxShadow: "var(--shadow-1)",
                      overflow: "hidden", zIndex: 10, minWidth: 200,
                    }}
                  >
                    <button
                      style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", background: "none", color: "var(--text)", textAlign: "left", cursor: "pointer", fontSize: 13 }}
                      onClick={() => { setShowActions(false); onCreateLesson(); }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <span style={{ marginRight: 8 }}>🆕</span>
                      {t("course.newLessonWizard")}
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{t("course.wizardHint")}</div>
                    </button>
                    <div style={{ borderTop: "1px solid var(--border)" }} />
                    <button
                      style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", background: "none", color: "var(--text)", textAlign: "left", cursor: "pointer", fontSize: 13 }}
                      onClick={() => { setShowActions(false); onAddLesson(); }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <span style={{ marginRight: 8 }}>📎</span>
                      {t("course.addExistingLesson")}
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{t("course.addExistingHint")}</div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selection action bar */}
        <AnimatePresence>
          {isSelectionMode && courseLessons.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: "var(--accent-2-soft)", border: "1px solid var(--accent-2)",
                borderRadius: 10, padding: "10px 16px", marginBottom: 12,
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={onSelectAll}>{t("course.selectAll")}</button>
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={onClearAll} disabled={selectionCount === 0}>{t("course.clearSelection")}</button>
                {selectionCount > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-2, #7c3aed)" }}>
                    {t("course.lessonsSelected", { count: selectionCount })}
                  </span>
                )}
              </div>
              <button
                className="btn btn-primary"
                style={{ fontSize: 12, background: selectionCount > 0 ? "var(--accent-2)" : undefined }}
                disabled={selectionCount === 0}
                onClick={onStudySelected}
              >
                {t("course.studySelected")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {courseLessons.length === 0 ? (
          <div
            className="muted-block"
            role="button"
            tabIndex={0}
            style={{ padding: 32, textAlign: "center", border: "2px dashed var(--border)", borderRadius: 12, cursor: "pointer" }}
            onClick={onCreateLesson}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onCreateLesson(); }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>{t("course.noLessonsAdded")}</p>
            <p className="muted" style={{ fontSize: 12 }}>{t("course.clickToCreate")}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {courseLessons.map((l, i) => (
              <LessonStatusCard
                key={l.id}
                lesson={l}
                weekIndex={i}
                onGoToLesson={onGoToLesson}
                onRemove={(lessonId) => onRemoveLesson(course.id, lessonId)}
                courseId={course.id}
                isSelectionMode={isSelectionMode}
                isSelected={selectedLessonIds.includes(l.id)}
                onToggleSelect={onToggleLesson}
              />
            ))}
          </div>
        )}
      </div>

      {ki && ki.loCoverage.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 className="h3" style={{ marginBottom: 8 }}>{t("course.loCoverage")}</h3>
          <div style={{ display: "grid", gap: 4 }}>
            {ki.loCoverage.map((lo) => (
              <div key={lo.loId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <CoverageBadge level={lo.coverageLevel} />
                <span style={{ fontWeight: 500, minWidth: 36 }}>{lo.loId}</span>
                <span className="muted" style={{ flex: 1 }}>{lo.loTitle.length > 60 ? lo.loTitle.slice(0, 60) + "..." : lo.loTitle}</span>
                <span className="small muted">{lo.coveredByLessons.length} ders</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ki && ki.conceptBridges.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 className="h3" style={{ marginBottom: 8 }}>{t("course.crossConcepts")}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ki.conceptBridges.map((b, i) => (
              <div key={i} className="card" style={{ padding: "6px 12px", fontSize: 12 }} title={b.evolution}>
                <span style={{ fontWeight: 600 }}>{b.concept}</span>
                <span className="muted" style={{ marginLeft: 6 }}>W{b.appearsInWeeks.join(", W")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ki && ki.overview.courseThemes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 className="h3" style={{ marginBottom: 8 }}>{t("course.courseThemes")}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ki.overview.courseThemes.map((theme, i) => (
              <span key={i} className="conn-lesson-tag">{theme}</span>
            ))}
          </div>
        </div>
      )}

      {ki && ki.progressSnapshot.weakTopics.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 className="h3" style={{ marginBottom: 8 }}>{t("course.weakTopicsTitle")}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ki.progressSnapshot.weakTopics.map((topic, i) => (
              <span key={i} className="conn-lesson-tag" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>{topic}</span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export const OverviewTab = React.memo(OverviewTabInner);
