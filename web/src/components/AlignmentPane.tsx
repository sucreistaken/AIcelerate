import React from "react";
import { Plan } from "../types";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { t } from "../utils/i18n";

/** Helper: Ortalama hesaplama */
function average(ns: number[]) {
  if (!ns.length) return NaN;
  const s = ns.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  const c = ns.filter((n) => Number.isFinite(n)).length;
  return c ? s / c : NaN;
}

export default function AlignmentPane({
  plan,
  deviation,
}: {
  plan: Plan;
  deviation?: any;
}) {
  const a = plan.alignment;
  const avg =
    a?.average_duration_min ??
    average(a?.items?.map((i) => i.duration_min) || []);

  return (
    <div className="grid-gap-12">
      <PaneInfoBanner
        id="alignment"
        title={t("alignment.title")}
        description={t("alignment.desc")}
        tips={[t("alignment.tips1"), t("alignment.tips2"), t("alignment.tips3")]}
      />
      <section className="lc-section grid-gap-10">
        <div className="fw-800 fs-18">{t("alignment.summaryTitle")}</div>

        {a?.summary_chatty ? (
          <p className="m-0">{a.summary_chatty}</p>
        ) : (
          <p className="m-0 op-70">
            Özet metni bulunamadı. Yine de aşağıdaki tablo eşleşmeleri ve
            süreleri gösterir.
          </p>
        )}

        <div className="lc-chipset">
          <div className="lc-chip">
            {t("alignment.avgDuration")} ~{Number.isFinite(avg) ? `${avg.toFixed(1)} ${t("alignment.min")}` : "—"}
          </div>
        </div>

        {/* ✅ Slayt Uyumu Özeti */}
        {deviation?.summary && (
          <div className="muted-block small mt-3">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Slayt Uyumu Özeti
            </div>
            <div className="small">
              On-slide: {deviation.summary.percent.on_slide}% • Expanded:{" "}
              {deviation.summary.percent.expanded}% • Off-slide:{" "}
              {deviation.summary.percent.off_slide}% • Banter:{" "}
              {deviation.summary.percent.banter}%
            </div>
          </div>
        )}
      </section>

      <section className="lc-section">
        <table className="aligned-table">
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
              <tr key={i}>
                <td>
                  <div className="fw-700">{it.topic}</div>
                  {!!it.concepts?.length && (
                    <div className="muted">{it.concepts.join(", ")}</div>
                  )}
                </td>

                <td>
                  <div className="lc-chipset m-0">
                    <span className="pill">
                      {it.in_both ? t("alignment.bothSources") : t("alignment.singleSource")}
                    </span>
                    <span className="pill">Emphasis: {it.emphasis_level}</span>
                    <span className="pill">
                      {t("alignment.confidence")} %{Math.round((it.confidence ?? 0) * 100)}
                    </span>
                  </div>
                </td>

                <td>
                  {it.lecture_quotes?.slice(0, 2).map((q, qi) => (
                    <div key={qi} className="muted">
                      “{q}”
                    </div>
                  ))}
                  {it.slide_refs?.slice(0, 2).map((s, si) => (
                    <div key={si} className="muted">
                      • {s}
                    </div>
                  ))}
                </td>

                <td className="fw-700">
                  {Number.isFinite(it.duration_min) ? it.duration_min.toFixed(1) : "—"}
                </td>
              </tr>
            ))}

            {!a?.items?.length && (
              <tr>
                <td colSpan={4} className="muted">
                  Eşleşme bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
