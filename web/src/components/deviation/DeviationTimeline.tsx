import React from "react";
import { motion } from "framer-motion";
import type { DeviationSegment } from "../../types";
import { safeGetStatus, StatusBadge } from "./DeviationHelpers";

interface DeviationTimelineProps {
    segments: DeviationSegment[];
    expandedBlocks: Set<number>;
    toggleBlock: (index: number) => void;
}

export default function DeviationTimeline({ segments, expandedBlocks, toggleBlock }: DeviationTimelineProps) {
    return (
        <section className="lc-section">
            <div className="fw-800 fs-18 mb-4">Zaman Akışı</div>

            {segments.length === 0 ? (
                <div className="text-muted" style={{ padding: 16 }}>
                    Segment bulunamadı (API 500 / boş response olabilir).
                </div>
            ) : (
                <div className="grid-gap-12">
                    {segments.map((seg, i) => {
                        const conf = safeGetStatus(seg?.status);
                        const isExpanded = expandedBlocks.has(seg?.index ?? i);
                        const text = seg?.text || "\—";
                        const MAX_LENGTH = 200;
                        const shouldTruncate = text.length > MAX_LENGTH;

                        return (
                            <motion.div
                                key={seg?.index ?? i}
                                className="dv-timeline-seg"
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                style={{
                                    padding: 16,
                                    borderRadius: 16,
                                    background: "var(--bg)",
                                    borderLeft: `4px solid ${conf.color}`,
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <StatusBadge status={seg?.status} />
                                        <span className="fw-700 text-sm font-mono opacity-60">
                                            {seg?.start || "00:00:00"} - {seg?.end || "00:00:00"}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted">
                                        %{Math.round((Number(seg?.slideCoverage ?? 0) || 0) * 100)} Eşleşme
                                    </div>
                                </div>

                                <div>
                                    <p
                                        className="m-0 text-sm"
                                        style={{
                                            lineHeight: 1.6,
                                            maxHeight: isExpanded || !shouldTruncate ? "none" : "4.8em",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            display: "-webkit-box",
                                            WebkitLineClamp: isExpanded || !shouldTruncate ? "unset" : 3,
                                            WebkitBoxOrient: "vertical",
                                        }}
                                    >
                                        {text}
                                    </p>

                                    {shouldTruncate && (
                                        <button
                                            onClick={() => toggleBlock(seg?.index ?? i)}
                                            style={{
                                                marginTop: 8,
                                                background: "transparent",
                                                border: "none",
                                                color: conf.color,
                                                cursor: "pointer",
                                                fontSize: 12,
                                                fontWeight: 700,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 4,
                                                padding: "4px 0",
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                                    transition: "transform 0.2s",
                                                    display: "inline-block",
                                                }}
                                            >
                                                ↓
                                            </span>
                                            {isExpanded ? "Daralt" : "Tümünü Göster"}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
