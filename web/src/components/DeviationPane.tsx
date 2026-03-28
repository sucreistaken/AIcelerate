import React from "react";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { t } from "../utils/i18n";
import { useDeviation } from "../hooks/useDeviation";
import DeviationLoading from "./deviation/DeviationLoading";
import DeviationError from "./deviation/DeviationError";
import DeviationEmpty from "./deviation/DeviationEmpty";
import DeviationSummary from "./deviation/DeviationSummary";
import DeviationTopics from "./deviation/DeviationTopics";
import DeviationTimeline from "./deviation/DeviationTimeline";
import type { DeviationPaneProps } from "../types";

export type { DeviationPaneProps };

export default function DeviationPane({
    deviation,
    loading = false,
    error = null,
    onGenerate,
    onReanalyze,
}: DeviationPaneProps) {
    const data = useDeviation(deviation);

    if (loading) return <DeviationLoading />;
    if (error) return <DeviationError error={String(error)} onRetry={onGenerate} />;
    if (!data) return <DeviationEmpty onGenerate={onGenerate} />;

    const {
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
    } = data;

    return (
        <div className="grid-gap-12">
            <PaneInfoBanner
                id="deviation"
                title={t("deviation.title")}
                description={t("deviation.desc")}
                tips={[t("deviation.tips1"), t("deviation.tips2"), t("deviation.tips3"), t("deviation.tips4")]}
            />

            <DeviationSummary
                summary={summary}
                segmentCount={segments.length}
                updatedAt={(deviation as any)?.updatedAt}
                percentOn={percentOn}
                percentExp={percentExp}
                percentSide={percentSide}
                percentOff={percentOff}
                percentBanter={percentBanter}
                relatedPct={relatedPct}
                onReanalyze={onReanalyze}
            />

            <DeviationTopics
                missedTopics={summary?.missedTopics || []}
                extraTopics={summary?.extraTopics || []}
            />

            <DeviationTimeline
                segments={segments}
                expandedBlocks={expandedBlocks}
                toggleBlock={toggleBlock}
            />
        </div>
    );
}
