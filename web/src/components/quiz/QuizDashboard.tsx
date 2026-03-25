import React from "react";
import { DashboardStats, QuizHistoryEntry } from "../../hooks/useQuizPane";

interface QuizDashboardProps {
  stats: DashboardStats;
  history: QuizHistoryEntry[];
  onDeepDive: () => void;
}

export default function QuizDashboard({ stats, history, onDeepDive }: QuizDashboardProps) {
  return (
    <div className="lc-section" style={{ background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginTop: 8 }}>
      <div className="fw-700 fs-16 mb-2">Sonuc Ozeti</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard value={`%${stats.score}`} label="Genel Skor" color={stats.score >= 70 ? '#00b894' : stats.score >= 40 ? '#fdcb6e' : '#e17055'} />
        <StatCard value={stats.correct} label="Dogru" color="#00b894" />
        <StatCard value={stats.partial} label="Kismen" color="#fdcb6e" />
        <StatCard value={stats.incorrect} label="Yanlis" color="#e17055" />
      </div>

      {stats.topMissed.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="fw-600 fs-13 mb-1" style={{ color: "var(--muted)" }}>Eksik Konular:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {stats.topMissed.map(([concept, count]) => (
              <span key={concept} style={{
                display: "inline-block", padding: "4px 10px", borderRadius: 6,
                background: "rgba(225, 112, 85, 0.15)", color: "#e17055", fontSize: 12, fontWeight: 600
              }}>
                {concept} ({count}x)
              </span>
            ))}
          </div>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 8, fontSize: 12 }}
            onClick={onDeepDive}
          >
            Deep Dive'da Calis &rarr;
          </button>
        </div>
      )}

      {history.length > 1 && (
        <div>
          <div className="fw-600 fs-13 mb-1" style={{ color: "var(--muted)" }}>Skor Trendi:</div>
          <div style={{ display: "flex", alignItems: "end", gap: 4, height: 40 }}>
            {history.slice(-8).map((h, i) => (
              <div key={i} style={{
                flex: 1, height: `${Math.max(h.score, 5)}%`, borderRadius: 3,
                background: h.score >= 70 ? '#00b894' : h.score >= 40 ? '#fdcb6e' : '#e17055',
                minWidth: 8, maxWidth: 32,
              }} title={`${new Date(h.date).toLocaleDateString()} - %${h.score}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center", padding: 12, borderRadius: 8, background: "var(--bg)" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
    </div>
  );
}
