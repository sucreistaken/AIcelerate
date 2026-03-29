import { logger } from "../utils/logger";
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { CheatSheet } from "../types";
import { exportToPdf } from "../utils/pdfExport";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { Badge } from "./ui/Badge";
import { ConfirmModal } from "./ui/ConfirmModal";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { NoCheatSheetEmpty } from "./ui/EmptyState";
import { CardSkeleton } from "./ui/Skeleton";
import { t as i18n } from "../utils/i18n";

function timeAgo(dateStr: string, lang: 'tr' | 'en'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'tr' ? 'Az önce' : 'Just now';
  if (mins < 60) return lang === 'tr' ? `${mins} dakika önce` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === 'tr' ? `${hours} saat önce` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === 'tr' ? `${days} gün önce` : `${days}d ago`;
}

export default function CheatSheetPane(props: {
  cheatSheet: CheatSheet | null;
  loading: boolean;
  error: string | null;
  onGenerate: (language: 'tr' | 'en') => void;
}) {
  const { cheatSheet, loading, error, onGenerate } = props;
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [prevLang, setPrevLang] = useState<'tr' | 'en'>(language);
  const [showLangConfirm, setShowLangConfirm] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-regenerate on language change
  useEffect(() => {
    if (language !== prevLang && cheatSheet) {
      setPrevLang(language);
      setShowLangConfirm(true);
    } else {
      setPrevLang(language);
    }
  }, [language]);

  const handleGenerate = () => {
    onGenerate(language);
  };

  const handleDownloadPdf = async () => {
    if (!contentRef.current || !cheatSheet) return;

    setPdfLoading(true);
    try {
      await exportToPdf(contentRef.current, cheatSheet.title || "CheatSheet");
    } catch (err) {
      logger.error("PDF export error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  // All CheatSheet labels now use the global i18n system
  const cs = {
    title: i18n("cheatSheet.title"),
    subtitle: i18n("cheatSheet.subtitle"),
    generate: i18n("cheatSheet.generate"),
    empty: i18n("cheatSheet.empty"),
    lastUpdate: i18n("cheatSheet.lastUpdate"),
    formulas: i18n("cheatSheet.formulas"),
    pitfalls: i18n("cheatSheet.pitfalls"),
    quickQuiz: i18n("cheatSheet.quickQuiz"),
    downloadPdf: i18n("cheatSheet.downloadPdf"),
    language: i18n("cheatSheet.langLabel"),
  };

  return (
    <motion.div
      className="lc-section"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <ConfirmModal
        isOpen={showLangConfirm}
        onConfirm={() => { setShowLangConfirm(false); onGenerate(language); }}
        onCancel={() => setShowLangConfirm(false)}
        title={i18n("cheatSheet.langChanged")}
        message={i18n("cheatSheet.langChange")}
        confirmLabel={i18n("cheatSheet.yesCreate")}
        cancelLabel={i18n("common.cancel")}
        variant="warning"
      />
      <PaneInfoBanner
        id="cheat-sheet"
        title={i18n("cheatSheet.bannerTitle")}
        description={i18n("cheatSheet.bannerDesc")}
        tips={[i18n("cheatSheet.bannerTip1"), i18n("cheatSheet.bannerTip2"), i18n("cheatSheet.bannerTip3"), i18n("cheatSheet.bannerTip4")]}
      />

      <div className="pane-header" style={{ marginBottom: 16 }}>
        <div className="pane-header__info">
          <div className="pane-header__title">{cs.title}</div>
          <div className="pane-header__desc">{cs.subtitle}</div>
        </div>
        <div className="pane-header__actions">
          <div className="u-flex u-items-center u-gap-2">
            <span className="u-text-sm u-text-muted">{cs.language}</span>
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'tr' | 'en')}
              selectSize="sm"
              fullWidth={false}
            >
              <option value="tr">{i18n("cheatSheet.langTr")}</option>
              <option value="en">{i18n("cheatSheet.langEn")}</option>
            </Select>
          </div>
          <Button onClick={handleGenerate} loading={loading} size="md">
            {cs.generate}
          </Button>
          {cheatSheet && (
            <Button variant="secondary" onClick={handleDownloadPdf} loading={pdfLoading} size="md">
              {cs.downloadPdf}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="u-text-danger u-text-sm u-mb-3">{error}</div>
      )}

      {loading && (
        <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!cheatSheet && !loading && !error && (
        <NoCheatSheetEmpty onAction={handleGenerate} />
      )}

      {cheatSheet && (
        <div ref={contentRef} className="grid-gap-12">
          <div className="u-flex u-items-center u-justify-between">
            <div className="u-font-extrabold u-text-md">{cheatSheet.title}</div>
            <div className="u-text-sm u-text-muted">
              {cs.lastUpdate} {timeAgo(cheatSheet.updatedAt, language)}
            </div>
          </div>

          {cheatSheet.sections?.map((sec, i) => (
            <div key={i} className="muted-block">
              <div className="u-font-bold u-mb-2">{sec.heading}</div>
              <ul className="u-m-0" style={{ paddingLeft: 18 }}>
                {(sec.bullets || []).map((b, k) => (
                  <li key={k} className="u-text-sm u-mb-1">{b}</li>
                ))}
              </ul>
            </div>
          ))}

          {!!cheatSheet.formulas?.length && (
            <div className="muted-block">
              <div className="u-font-bold u-mb-2"><Badge variant="soft" size="sm">{cs.formulas}</Badge></div>
              <ul className="u-m-0" style={{ paddingLeft: 18 }}>
                {cheatSheet.formulas.map((f, i) => <li key={i} className="u-text-sm">{f}</li>)}
              </ul>
            </div>
          )}

          {!!cheatSheet.pitfalls?.length && (
            <div className="muted-block">
              <div className="u-font-bold u-mb-2"><Badge variant="warning" size="sm">{cs.pitfalls}</Badge></div>
              <ul className="u-m-0" style={{ paddingLeft: 18 }}>
                {cheatSheet.pitfalls.map((p, i) => <li key={i} className="u-text-sm">{p}</li>)}
              </ul>
            </div>
          )}

          {!!cheatSheet.quickQuiz?.length && (
            <div className="muted-block">
              <div className="u-font-bold u-mb-2"><Badge variant="primary" size="sm">{cs.quickQuiz}</Badge></div>
              <ul className="u-m-0" style={{ paddingLeft: 18 }}>
                {cheatSheet.quickQuiz.map((qa, i) => (
                  <li key={i} className="u-text-sm u-mb-2">
                    <div><b>Q:</b> {qa.q}</div>
                    <div><b>A:</b> {qa.a}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
