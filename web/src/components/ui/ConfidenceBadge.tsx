import React from "react";
import { t } from "../../utils/i18n";
import type { ConfidenceScore } from "../../types";

interface ConfidenceBadgeProps {
  score?: ConfidenceScore | null;
  compact?: boolean;
}

function scoreColor(value: number): string {
  if (value >= 0.8) return "var(--success)";
  if (value >= 0.6) return "var(--accent-2)";
  if (value >= 0.4) return "var(--warning)";
  return "var(--danger)";
}

function scoreBg(value: number): string {
  if (value >= 0.8) return "var(--success-bg)";
  if (value >= 0.6) return "var(--accent-2-soft)";
  if (value >= 0.4) return "var(--warning-bg)";
  return "var(--danger-bg)";
}

function ScoreDot({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: scoreColor(value),
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: scoreColor(value) }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export function ConfidenceBadge({ score, compact }: ConfidenceBadgeProps) {
  if (!score) {
    if (compact) return null;
    return (
      <span
        className="lc-badge lc-badge--default lc-badge--sm"
        style={{ opacity: 0.5 }}
      >
        {t("confidence.noScore")}
      </span>
    );
  }

  const avg = (score.coverage + score.accuracy + score.completeness) / 3;

  if (compact) {
    return (
      <span
        className="lc-badge lc-badge--sm"
        style={{
          backgroundColor: scoreBg(avg),
          color: scoreColor(avg),
          border: `1px solid ${scoreColor(avg)}`,
          fontWeight: 600,
          fontSize: "var(--text-xs)",
        }}
        title={`${t("confidence.coverage")}: ${Math.round(score.coverage * 100)}% | ${t("confidence.accuracy")}: ${Math.round(score.accuracy * 100)}% | ${t("confidence.completeness")}: ${Math.round(score.completeness * 100)}%`}
      >
        {t("confidence.title")} {Math.round(avg * 100)}%
      </span>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "10px 14px",
        borderRadius: "var(--radius-sm)",
        backgroundColor: "var(--input-bg)",
        border: "1px solid var(--hair)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text)" }}>
          {t("confidence.title")}
        </span>
        <span
          className="lc-badge lc-badge--sm"
          style={{
            backgroundColor: scoreBg(avg),
            color: scoreColor(avg),
            border: `1px solid ${scoreColor(avg)}`,
            fontWeight: 600,
          }}
        >
          {Math.round(avg * 100)}%
        </span>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <ScoreDot value={score.coverage} label={t("confidence.coverage")} />
        <ScoreDot value={score.accuracy} label={t("confidence.accuracy")} />
        <ScoreDot value={score.completeness} label={t("confidence.completeness")} />
      </div>
      {score.flags.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
          {score.flags.map((flag, i) => (
            <span
              key={i}
              className="lc-badge lc-badge--warning lc-badge--sm"
              style={{ fontSize: 10 }}
            >
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
