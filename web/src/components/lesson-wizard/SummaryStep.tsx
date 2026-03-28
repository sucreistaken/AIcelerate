import React from "react";
import type { Course } from "../../types";
import { t } from "../../utils/i18n";
import StreamingOverlay from "../ui/StreamingOverlay";
import type { StreamingState } from "../../hooks/useStreamingAnalysis";

interface Props {
  title: string;
  weekNumber: string;
  course: Course | null;
  slidesText: string;
  lectureText: string;
  isAnalyzing: boolean;
  canAnalyze: boolean;
  error: string | null;
  streaming?: StreamingState;
  onAnalyze: () => void;
  onBack: () => void;
}

function MaterialBadge({ label, icon, hasContent, charCount }: {
  label: string; icon: string; hasContent: boolean; charCount: number;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderLeft: `3px solid ${hasContent ? "var(--success)" : "var(--muted)"}`,
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{label}</div>
        <div className="muted" style={{ fontSize: 11 }}>
          {hasContent
            ? `${charCount.toLocaleString()} ${t("wizard.chars")}`
            : t("wizard.notUploaded")}
        </div>
      </div>
      <span style={{
        fontSize: 18,
        color: hasContent ? "var(--success)" : "var(--muted)",
      }}>
        {hasContent ? "✓" : "—"}
      </span>
    </div>
  );
}

export default function SummaryStep({
  title, weekNumber, course, slidesText, lectureText,
  isAnalyzing, canAnalyze, error, streaming, onAnalyze, onBack,
}: Props) {
  const fullTitle = weekNumber ? `Week ${weekNumber} - ${title}` : title;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <h3 className="h3" style={{ marginBottom: 4 }}>{t("wizard.summaryTitle")}</h3>
      <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
        {t("wizard.summaryDesc2")}
      </p>

      {/* Lesson info summary */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>📝</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{fullTitle}</div>
            {course && (
              <div className="muted" style={{ fontSize: 12 }}>
                {course.code} — {course.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Material status */}
      <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <MaterialBadge
          label={t("wizard.slidesLabel")}
          icon="📄"
          hasContent={slidesText.length > 0}
          charCount={slidesText.length}
        />
        <MaterialBadge
          label={t("wizard.transcriptLabel")}
          icon="🎙️"
          hasContent={lectureText.length > 0}
          charCount={lectureText.length}
        />
      </div>

      {/* Info message */}
      {canAnalyze && (
        <div
          style={{
            background: "var(--ring)",
            border: "1px solid var(--accent-2)",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 12,
            color: "var(--text)",
          }}
        >
          ✨ {t("wizard.aiInfo")}
        </div>
      )}

      {!canAnalyze && (
        <div
          style={{
            background: "var(--danger-bg, var(--warning-bg))",
            border: "1px solid var(--danger, var(--warning))",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 12,
          }}
        >
          ⚠️ {t("wizard.analyzeRequired")}
        </div>
      )}

      {/* Streaming Overlay - shows during analysis */}
      {streaming?.isStreaming && (
        <StreamingOverlay
          isStreaming={streaming.isStreaming}
          phases={streaming.phases}
          progress={streaming.progress}
          tokenCount={streaming.tokenCount}
          modules={streaming.modules}
          emphases={streaming.emphases}
          currentPhase={streaming.currentPhase}
          error={streaming.error}
        />
      )}

      {error && !streaming?.isStreaming && (
        <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!streaming?.isStreaming && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button className="btn btn-ghost" onClick={onBack} type="button">{t("wizard.back")}</button>
          <button
            className="btn btn-primary"
            onClick={onAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            type="button"
            style={{
              background: canAnalyze ? "linear-gradient(135deg, #9C27B0, #7B1FA2)" : undefined,
            }}
          >
            {isAnalyzing ? t("wizard.analyzing") : t("wizard.analyze")}
          </button>
        </div>
      )}
    </div>
  );
}
