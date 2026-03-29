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
      style={{
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderLeft: `3px solid ${hasContent ? "var(--success)" : "var(--border)"}`,
        background: hasContent ? "var(--success-soft)" : "var(--input-bg)",
        borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
        transition: "all 0.2s ease",
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)" }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
          {hasContent
            ? `${charCount.toLocaleString()} ${t("wizard.chars")}`
            : t("wizard.notUploaded")}
        </div>
      </div>
      <span style={{
        fontSize: 16,
        color: hasContent ? "var(--success)" : "var(--muted)",
        fontWeight: 700,
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
    <div className="wizard-step-card">
      <h3 className="wizard-step-card__title">{t("wizard.summaryTitle")}</h3>
      <p className="wizard-step-card__desc">
        {t("wizard.summaryDesc2")}
      </p>

      {/* Lesson info summary */}
      <div style={{
        padding: "16px 18px",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--input-bg)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
      }}>
        <span style={{ fontSize: 22 }}>📝</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "var(--fs-md)" }}>{fullTitle}</div>
          {course && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
              {course.code} — {course.name}
            </div>
          )}
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
            border: "1px solid color-mix(in srgb, var(--accent-2) 25%, transparent)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 12,
            color: "var(--text)",
            lineHeight: 1.5,
          }}
        >
          ✨ {t("wizard.aiInfo")}
        </div>
      )}

      {!canAnalyze && (
        <div
          style={{
            background: "var(--warning-soft)",
            border: "1px solid color-mix(in srgb, var(--warning) 25%, transparent)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 12,
          }}
        >
          ⚠️ {t("wizard.analyzeRequired")}
        </div>
      )}

      {/* Streaming Overlay */}
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
        <div className="wizard-error">
          {error}
        </div>
      )}

      {!streaming?.isStreaming && (
        <div className="wizard-actions">
          <button className="btn btn-ghost" onClick={onBack} type="button">{t("wizard.back")}</button>
          <button
            className="btn btn-primary"
            onClick={onAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            type="button"
            style={{
              background: canAnalyze ? "linear-gradient(135deg, #a855f7, #7c3aed)" : undefined,
            }}
          >
            {isAnalyzing ? t("wizard.analyzing") : t("wizard.analyze")}
          </button>
        </div>
      )}
    </div>
  );
}
