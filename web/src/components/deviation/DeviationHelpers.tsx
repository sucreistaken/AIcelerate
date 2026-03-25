import React from "react";

export const statusConfig = {
    on_slide: { label: "Slayta Uygun", color: "#10b981" },
    expanded: { label: "Genişletilmiş", color: "#3b82f6" },
    side_topic: { label: "Yan Konu", color: "#8b5cf6" },
    off_slide: { label: "Konu Sapması", color: "#f59e0b" },
    banter: { label: "Sohbet/Diğer", color: "#ef4444" },
};

export type StatusKey = keyof typeof statusConfig;

export function safeGetStatus(status: any): typeof statusConfig.on_slide {
    const key = (typeof status === "string" ? status : "") as StatusKey;
    return statusConfig[key] || statusConfig.off_slide;
}

export function clamp(n: number, a = 0, b = 100) {
    if (Number.isNaN(n)) return a;
    return Math.max(a, Math.min(b, n));
}

export function ScoreGauge({ score }: { score: number }) {
    const v = clamp(Math.round(score ?? 0), 0, 100);
    const ring = `conic-gradient(#10b981 ${v * 3.6}deg, var(--border) 0deg)`;

    return (
        <div style={{ display: "grid", placeItems: "center" }}>
            <div
                className="dv-gauge-ring"
                style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: ring,
                    display: "grid",
                    placeItems: "center",
                    padding: 10,
                }}
            >
                <div
                    className="dv-gauge-inner"
                    style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        background: "var(--bg)",
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid var(--border)",
                    }}
                >
                    <div style={{ textAlign: "center" }}>
                        <div className="fw-800" style={{ fontSize: 26, lineHeight: 1 }}>
                            {v}
                        </div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                            / 100
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function StatusBadge({ status }: { status: any }) {
    const conf = safeGetStatus(status);
    return (
        <span
            className="pill"
            style={{
                backgroundColor: `${conf.color}15`,
                color: conf.color,
                border: `1px solid ${conf.color}30`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
            }}
        >
            <span>{conf.label}</span>
        </span>
    );
}
