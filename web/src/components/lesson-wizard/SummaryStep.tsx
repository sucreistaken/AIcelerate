import React from "react";
import type { Course } from "../../types";

interface Props {
  title: string;
  weekNumber: string;
  course: Course | null;
  slidesText: string;
  lectureText: string;
  isAnalyzing: boolean;
  canAnalyze: boolean;
  error: string | null;
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
            ? `${charCount.toLocaleString()} karakter`
            : "Yüklenmedi (opsiyonel)"}
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
  isAnalyzing, canAnalyze, error, onAnalyze, onBack,
}: Props) {
  const fullTitle = weekNumber ? `Week ${weekNumber} - ${title}` : title;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <h3 className="h3" style={{ marginBottom: 4 }}>Özet & Analiz</h3>
      <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
        Yüklenen materyalleri kontrol edin ve AI analizini başlatın
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
          label="Slaytlar"
          icon="📄"
          hasContent={slidesText.length > 0}
          charCount={slidesText.length}
        />
        <MaterialBadge
          label="Ders Transkripti"
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
          ✨ AI analiz ile <strong>ders planı</strong>, <strong>vurgular</strong>,{" "}
          <strong>quiz soruları</strong> ve <strong>flashcard</strong>'lar otomatik oluşturulacak.
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
          ⚠️ <strong>Analiz zorunludur.</strong> Devam edebilmek için en az slayt veya transkript yükleyin. Geri dönüp materyal ekleyebilirsiniz.
        </div>
      )}

      {error && (
        <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn btn-ghost" onClick={onBack} type="button">← Geri</button>
        <button
          className="btn btn-primary"
          onClick={onAnalyze}
          disabled={!canAnalyze || isAnalyzing}
          type="button"
          style={{
            background: canAnalyze ? "linear-gradient(135deg, #9C27B0, #7B1FA2)" : undefined,
          }}
        >
          {isAnalyzing ? "Analiz ediliyor..." : "✨ Analiz Et"}
        </button>
      </div>
    </div>
  );
}
