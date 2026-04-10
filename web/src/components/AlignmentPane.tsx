import React from "react";
import { motion } from "framer-motion";
import { Plan } from "../types";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { EmptyState } from "./ui/EmptyState";
import { t } from "../utils/i18n";

function average(ns: number[]) {
  if (!ns.length) return NaN;
  const s = ns.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  const c = ns.filter((n) => Number.isFinite(n)).length;
  return c ? s / c : NaN;
}

export default function AlignmentPane({ plan, deviation }: { plan: Plan; deviation?: any }) {
  const a = plan.alignment;
  const avg = a?.average_duration_min ?? average(a?.items?.map((i) => i.duration_min) || []);

  return (
    <motion.div
      className="al"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <PaneInfoBanner
        id="alignment"
        title={t("alignment.title")}
        description={t("alignment.desc")}
        tips={[t("alignment.tips1"), t("alignment.tips2"), t("alignment.tips3")]}
      />

      <motion.header
        className="al__header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="al__header-left">
          <div className="al__header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/>
            </svg>
          </div>
          <div>
            <h1 className="al__title">{t("alignment.summaryTitle")}</h1>
            {a?.summary_chatty ? (
              <p className="al__summary">{a.summary_chatty}</p>
            ) : (
              <p className="al__summary al__summary--empty">{t("alignment.noSummary")}</p>
            )}
          </div>
        </div>
        <div className="al__header-meta">
          <div className="al__stat">
            <div className="al__stat-value">{Number.isFinite(avg) ? `${avg.toFixed(1)}` : "—"}</div>
            <div className="al__stat-label">{t("alignment.min")} ort.</div>
          </div>
          <div className="al__stat">
            <div className="al__stat-value">{a?.items?.length || 0}</div>
            <div className="al__stat-label">Konu</div>
          </div>
        </div>
      </motion.header>

      {deviation?.summary && (
        <motion.div
          className="al__deviation-summary"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="al__deviation-title">{t("alignment.deviationSummary")}</div>
          <div className="al__deviation-bars">
            <span className="al__dev-chip al__dev-chip--on">On-slide {deviation.summary.percent.on_slide}%</span>
            <span className="al__dev-chip al__dev-chip--exp">Expanded {deviation.summary.percent.expanded}%</span>
            <span className="al__dev-chip al__dev-chip--off">Off-slide {deviation.summary.percent.off_slide}%</span>
            <span className="al__dev-chip al__dev-chip--ban">Banter {deviation.summary.percent.banter}%</span>
          </div>
        </motion.div>
      )}

      <section className="al__table-wrap">
        {(a?.items?.length ?? 0) > 0 ? (
          <div className="al__table-container">
            <table className="al__table">
              <thead>
                <tr>
                  <th>{t("alignment.topicConcepts")}</th>
                  <th>{t("alignment.emphasis")}</th>
                  <th>{t("alignment.sources")}</th>
                  <th>{t("alignment.durationMin")}</th>
                </tr>
              </thead>
              <tbody>
                {(a?.items || []).map((it, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: 0.05 + i * 0.03 }}
                  >
                    <td>
                      <div className="al__topic-name">{it.topic}</div>
                      {!!it.concepts?.length && <div className="al__topic-concepts">{it.concepts.join(", ")}</div>}
                    </td>
                    <td>
                      <div className="al__emphasis-chips">
                        <span className="al__pill">{it.in_both ? t("alignment.bothSources") : t("alignment.singleSource")}</span>
                        <span className="al__pill">Emphasis: {it.emphasis_level}</span>
                        <span className="al__pill">{t("alignment.confidence")} %{Math.round((it.confidence ?? 0) * 100)}</span>
                      </div>
                    </td>
                    <td>
                      {it.lecture_quotes?.slice(0, 2).map((q, qi) => (
                        <div key={qi} className="al__quote">"{q}"</div>
                      ))}
                      {it.slide_refs?.slice(0, 2).map((s, si) => (
                        <div key={si} className="al__slide-ref">• {s}</div>
                      ))}
                    </td>
                    <td className="al__duration">
                      {Number.isFinite(it.duration_min) ? it.duration_min.toFixed(1) : "—"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={t("alignment.noItems")} description={t("alignment.noItemsDesc")} />
        )}
      </section>
    </motion.div>
  );
}
