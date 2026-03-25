import { useState, useCallback } from "react";
import type { DeviationResult, DeviationSegment, DeviationSummary } from "../types";
import { clamp } from "../components/deviation/DeviationHelpers";

export interface UseDeviationReturn {
    summary: DeviationSummary;
    segments: DeviationSegment[];
    expandedBlocks: Set<number>;
    toggleBlock: (index: number) => void;
    percentOn: number;
    percentExp: number;
    percentSide: number;
    percentOff: number;
    percentBanter: number;
    relatedPct: number;
}

export function useDeviation(
    deviation: (DeviationResult & { updatedAt?: number | string }) | undefined
): UseDeviationReturn | null {
    const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());

    const toggleBlock = useCallback((index: number) => {
        setExpandedBlocks((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    }, []);

    if (!deviation) return null;

    const summary = deviation.summary;
    const segments = Array.isArray(deviation.segments) ? deviation.segments : [];

    const p = summary?.percent || ({} as any);
    const percentOn = clamp(Number(p.on_slide ?? 0));
    const percentExp = clamp(Number(p.expanded ?? 0));
    const percentSide = clamp(Number(p.side_topic ?? 0));
    const percentOff = clamp(Number(p.off_slide ?? 0));
    const percentBanter = clamp(Number(p.banter ?? 0));
    const relatedPct = clamp(Math.round(percentOn + percentExp));

    return {
        summary,
        segments,
        expandedBlocks,
        toggleBlock,
        percentOn,
        percentExp,
        percentSide,
        percentOff,
        percentBanter,
        relatedPct,
    };
}
