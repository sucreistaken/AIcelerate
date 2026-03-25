import React from "react";
import type { DeviationSummary as DeviationSummaryType } from "../../types";
import { formatLocaleTime as formatTime } from "../../utils/formatters";
import { statusConfig, ScoreGauge } from "./DeviationHelpers";

interface DeviationSummaryProps {
    summary: DeviationSummaryType;
    segmentCount: number;
    updatedAt?: number | string;
    percentOn: number;
    percentExp: number;
    percentSide: number;
    percentOff: number;
    percentBanter: number;
    relatedPct: number;
    onReanalyze?: () => void;
}

export default function DeviationSummary({
    summary,
    segmentCount,
    updatedAt,
    percentOn,
    percentExp,
    percentSide,
    percentOff,
    percentBanter,
    relatedPct,
    onReanalyze,
}: DeviationSummaryProps) {
    return (
        <section className="lc-section">
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 16,
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                }}
            >
                <div className="fw-800 fs-18">Genel Değerlendirme</div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                        Son analiz: {formatTime(updatedAt || Date.now())}
                    </div>
                    {onReanalyze && (
                        <button
                            className="btn btn-ghost"
                            onClick={onReanalyze}
                            style={{ fontSize: 12, padding: "6px 12px" }}
                        >
                            Yeniden Analiz Et
                        </button>
                    )}
                </div>
            </div>

            {summary?.isDeckMismatch && (
                <div
                    className="dv-mismatch"
                    style={{
                        padding: 14,
                        borderRadius: 14,
                        border: "1px solid var(--warning)",
                        background: "var(--warning-soft)",
                        marginBottom: 16,
                    }}
                >
                    <div className="fw-800" style={{ color: "#f59e0b", marginBottom: 4 }}>
                        Slayt / Konu Uyumsuzluğu
                    </div>
                    <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                        Transcript ile slaytların ana konusu farklı görünüyor.
                        {typeof summary.deckSimilarity === "number" ? (
                            <>
                                {" "}
                                (Deck similarity: <strong>{summary.deckSimilarity.toFixed(2)}</strong>)
                            </>
                        ) : null}
                    </div>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, alignItems: "center" }}>
                <ScoreGauge score={summary?.overallScore ?? 0} />

                <div>
                    <h3 className="fw-700 fs-18 mb-2" style={{ color: "var(--text)" }}>
                        {summary?.interpretation || "\—"}
                    </h3>
                    <p className="text-muted" style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
                        Toplam <strong>{summary?.totalSegments ?? segmentCount}</strong> segment incelendi.
                        Dersin <strong>%{relatedPct}</strong> kadarı slaytlarla doğrudan ilişkili.
                    </p>

                    <div style={{ display: "flex", gap: 8 }}>
                        <div
                            style={{
                                flex: 1,
                                background: "var(--bg)",
                                height: 8,
                                borderRadius: 4,
                                overflow: "hidden",
                                display: "flex",
                            }}
                        >
                            <div style={{ width: `${percentOn}%`, background: statusConfig.on_slide.color }} />
                            <div style={{ width: `${percentExp}%`, background: statusConfig.expanded.color }} />
                            <div style={{ width: `${percentSide}%`, background: statusConfig.side_topic.color }} />
                            <div style={{ width: `${percentOff}%`, background: statusConfig.off_slide.color }} />
                            <div style={{ width: `${percentBanter}%`, background: statusConfig.banter.color }} />
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "var(--muted)", flexWrap: "wrap" }}>
                        <span style={{ color: statusConfig.on_slide.color }}>● Slayta Uygun</span>
                        <span style={{ color: statusConfig.expanded.color }}>● Genişletilmiş</span>
                        <span style={{ color: statusConfig.side_topic.color }}>● Yan Konu</span>
                        <span style={{ color: statusConfig.off_slide.color }}>● Sapma</span>
                        <span style={{ color: statusConfig.banter.color }}>● Sohbet</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
