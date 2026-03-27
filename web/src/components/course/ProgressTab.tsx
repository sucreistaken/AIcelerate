import React from "react";
import type { CourseProgress } from "../../types";
import { t } from "../../utils/i18n";

function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ flex: 1 }}>
      {label && <div className="small muted" style={{ marginBottom: 2 }}>{label}</div>}
      <div style={{ height: 8, background: "var(--hair)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.3s" }} />
      </div>
      <div className="small muted" style={{ marginTop: 2 }}>{pct}%</div>
    </div>
  );
}

interface ProgressTabProps {
  progressLoading: boolean;
  courseProgress: CourseProgress | null;
}

function ProgressTabInner({ progressLoading, courseProgress }: ProgressTabProps) {
  if (progressLoading) {
    return (
      <div className="muted-block" style={{ padding: 24, textAlign: "center" }}>{t("course.loadingProgress")}</div>
    );
  }

  if (!courseProgress) {
    return (
      <div className="muted-block" style={{ padding: 24, textAlign: "center" }}>
        <p className="muted">{t("course.noProgressData")}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 className="h3" style={{ marginBottom: 8 }}>{t("course.lessonCompletion")}</h3>
        <ProgressBar
          value={courseProgress.completedLessons}
          max={courseProgress.totalLessons}
          color="var(--success, #22c55e)"
          label={`${courseProgress.completedLessons} / ${courseProgress.totalLessons} ${t("course.stat.lessons").toLowerCase()}`}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 className="h3" style={{ marginBottom: 8 }}>{t("course.perLessonStatus")}</h3>
        <div style={{ display: "grid", gap: 6 }}>
          {courseProgress.lessonStatuses.map((ls, i) => (
            <div key={ls.lessonId} className="card" style={{ padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  <span className="muted" style={{ marginRight: 6 }}>W{i + 1}</span>
                  {ls.title}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{
                    fontSize: 10, padding: "2px 6px", borderRadius: 4,
                    background: ls.hasTranscript ? "var(--success-bg)" : "var(--hair)",
                    color: ls.hasTranscript ? "var(--success)" : "var(--muted)",
                  }}>
                    Transcript
                  </span>
                  <span style={{
                    fontSize: 10, padding: "2px 6px", borderRadius: 4,
                    background: ls.hasPlan ? "var(--success-bg)" : "var(--hair)",
                    color: ls.hasPlan ? "var(--success)" : "var(--muted)",
                  }}>
                    Plan
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {ls.quizScores.length > 0 && (
                  <div style={{ flex: 1 }}>
                    <div className="small muted" style={{ marginBottom: 2 }}>Quiz Scores</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {ls.quizScores.map((s, si) => (
                        <div
                          key={si}
                          style={{
                            height: 20, minWidth: 28,
                            background: s >= 0.7 ? "var(--success)" : s >= 0.4 ? "var(--warning)" : "var(--danger)",
                            borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700, color: "white",
                          }}
                        >
                          {Math.round(s * 100)}%
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {ls.flashcardStats.total > 0 && (
                  <div>
                    <div className="small muted" style={{ marginBottom: 2 }}>Flashcards</div>
                    <div style={{ display: "flex", gap: 4, fontSize: 10 }}>
                      <span style={{ color: "var(--success)" }}>{ls.flashcardStats.graduated}G</span>
                      <span style={{ color: "var(--warning)" }}>{ls.flashcardStats.review}R</span>
                      <span style={{ color: "var(--accent-2)" }}>{ls.flashcardStats.learning}L</span>
                      <span className="muted">{ls.flashcardStats.new}N</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {courseProgress.overallQuizAvg > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 className="h3" style={{ marginBottom: 8 }}>Overall Quiz Average</h3>
          <ProgressBar
            value={courseProgress.overallQuizAvg * 100}
            max={100}
            color={courseProgress.overallQuizAvg >= 0.7 ? "var(--success)" : courseProgress.overallQuizAvg >= 0.4 ? "var(--warning)" : "var(--danger)"}
            label={`${Math.round(courseProgress.overallQuizAvg * 100)}%`}
          />
        </div>
      )}

      {courseProgress.flashcardSummary.total > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 className="h3" style={{ marginBottom: 8 }}>Flashcard Breakdown</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 8 }}>
            {[
              { label: t("course.flashcardStats.total"), value: courseProgress.flashcardSummary.total, color: "var(--accent-2)" },
              { label: t("course.flashcardStats.new"), value: courseProgress.flashcardSummary.new, color: "var(--muted)" },
              { label: t("course.flashcardStats.learning"), value: courseProgress.flashcardSummary.learning, color: "var(--accent-2)" },
              { label: t("course.flashcardStats.review"), value: courseProgress.flashcardSummary.review, color: "var(--warning)" },
              { label: t("course.flashcardStats.graduated"), value: courseProgress.flashcardSummary.graduated, color: "var(--success)" },
              { label: t("course.flashcardStats.due"), value: courseProgress.flashcardSummary.due, color: "var(--danger)" },
            ].map((stat, i) => (
              <div key={i} className="card" style={{ padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div className="small muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(courseProgress.weakTopics.length > 0 || courseProgress.strongTopics.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {courseProgress.weakTopics.length > 0 && (
            <div>
              <h3 className="h3" style={{ marginBottom: 6 }}>Weak Topics</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {courseProgress.weakTopics.map((t, i) => (
                  <span key={i} style={{
                    padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: "var(--danger-bg)", color: "var(--danger)",
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {courseProgress.strongTopics.length > 0 && (
            <div>
              <h3 className="h3" style={{ marginBottom: 6 }}>Strong Topics</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {courseProgress.strongTopics.map((t, i) => (
                  <span key={i} style={{
                    padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: "var(--success-bg)", color: "var(--success)",
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ProgressTab = React.memo(ProgressTabInner);
