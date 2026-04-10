import React from "react";
import { motion } from "framer-motion";
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
  deviation, loading = false, error = null, onGenerate, onReanalyze,
}: DeviationPaneProps) {
  const data = useDeviation(deviation);

  if (loading) return <DeviationLoading />;
  if (error) return <DeviationError error={String(error)} onRetry={onGenerate} />;
  if (!data) return <DeviationEmpty onGenerate={onGenerate} />;

  const { summary, segments, expandedBlocks, toggleBlock, percentOn, percentExp, percentSide, percentOff, percentBanter, relatedPct } = data;

  return (
    <motion.div
      className="dv"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <PaneInfoBanner
        id="deviation"
        title={t("deviation.title")}
        description={t("deviation.desc")}
        tips={[t("deviation.tips1"), t("deviation.tips2"), t("deviation.tips3"), t("deviation.tips4")]}
      />

      <motion.div
        className="dv__hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="dv__hero-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
          </svg>
        </div>
        <h1 className="dv__hero-title">{t("deviation.title")}</h1>
      </motion.div>

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
    </motion.div>
  );
}
