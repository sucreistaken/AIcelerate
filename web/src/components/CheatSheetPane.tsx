import { logger } from "../utils/logger";
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { CheatSheet } from "../types";
import { exportToPdf } from "../utils/pdfExport";
import { Select } from "./ui/Select";
import { ConfirmModal } from "./ui/ConfirmModal";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { NoCheatSheetEmpty } from "./ui/EmptyState";
import { CardSkeleton } from "./ui/Skeleton";
import { t as i18n } from "../utils/i18n";

function timeAgo(dateStr: string, lang: 'tr' | 'en'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'tr' ? 'Az once' : 'Just now';
  if (mins < 60) return lang === 'tr' ? `${mins} dakika once` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === 'tr' ? `${hours} saat once` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === 'tr' ? `${days} gun once` : `${days}d ago`;
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

  useEffect(() => {
    if (language !== prevLang && cheatSheet) {
      setPrevLang(language);
      setShowLangConfirm(true);
    } else {
      setPrevLang(language);
    }
  }, [language]);

  const handleGenerate = () => onGenerate(language);

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

  return (
    <motion.div
      className="cs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
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

      <motion.header
        className="cs__header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="cs__header-left">
          <div className="cs__header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
          </div>
          <div>
            <h1 className="cs__title">{i18n("cheatSheet.title")}</h1>
            <p className="cs__desc">{i18n("cheatSheet.subtitle")}</p>
          </div>
        </div>
        <div className="cs__header-actions">
          <div className="cs__lang-select">
            <Select value={language} onChange={(e) => setLanguage(e.target.value as 'tr' | 'en')} selectSize="sm" fullWidth={false}>
              <option value="tr">{i18n("cheatSheet.langTr")}</option>
              <option value="en">{i18n("cheatSheet.langEn")}</option>
            </Select>
          </div>
          <button className="cs__action-btn cs__action-btn--primary" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <><svg className="cs__spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> {i18n("cheatSheet.generate")}</>
            ) : i18n("cheatSheet.generate")}
          </button>
          {cheatSheet && (
            <button className="cs__action-btn" onClick={handleDownloadPdf} disabled={pdfLoading}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              PDF
            </button>
          )}
        </div>
      </motion.header>

      {error && <div className="cs__error">{error}</div>}

      {loading && (
        <div className="cs__loading">
          <CardSkeleton /><CardSkeleton />
        </div>
      )}

      {!cheatSheet && !loading && !error && (
        <NoCheatSheetEmpty onAction={handleGenerate} />
      )}

      {cheatSheet && (
        <div ref={contentRef} className="cs__content">
          <div className="cs__content-meta">
            <span className="cs__content-title">{cheatSheet.title}</span>
            <span className="cs__content-time">{i18n("cheatSheet.lastUpdate")} {timeAgo(cheatSheet.updatedAt, language)}</span>
          </div>

          {cheatSheet.sections?.map((sec, i) => (
            <motion.div
              key={i}
              className="cs__section"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 + i * 0.04 }}
            >
              <div className="cs__section-heading">{sec.heading}</div>
              <ul className="cs__section-bullets">
                {(sec.bullets || []).map((b, k) => <li key={k} className="cs__bullet">{b}</li>)}
              </ul>
            </motion.div>
          ))}

          {!!cheatSheet.formulas?.length && (
            <motion.div className="cs__section cs__section--formulas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.15 }}>
              <div className="cs__section-heading">
                <span className="cs__section-badge cs__section-badge--formula">{i18n("cheatSheet.formulas")}</span>
              </div>
              <ul className="cs__section-bullets">
                {cheatSheet.formulas.map((f, i) => <li key={i} className="cs__bullet">{f}</li>)}
              </ul>
            </motion.div>
          )}

          {!!cheatSheet.pitfalls?.length && (
            <motion.div className="cs__section cs__section--pitfalls" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.2 }}>
              <div className="cs__section-heading">
                <span className="cs__section-badge cs__section-badge--pitfall">{i18n("cheatSheet.pitfalls")}</span>
              </div>
              <ul className="cs__section-bullets">
                {cheatSheet.pitfalls.map((p, i) => <li key={i} className="cs__bullet">{p}</li>)}
              </ul>
            </motion.div>
          )}

          {!!cheatSheet.quickQuiz?.length && (
            <motion.div className="cs__section cs__section--quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.25 }}>
              <div className="cs__section-heading">
                <span className="cs__section-badge cs__section-badge--quiz">{i18n("cheatSheet.quickQuiz")}</span>
              </div>
              <div className="cs__qa-list">
                {cheatSheet.quickQuiz.map((qa, i) => (
                  <div key={i} className="cs__qa">
                    <div className="cs__qa-q"><strong>S:</strong> {qa.q}</div>
                    <div className="cs__qa-a"><strong>C:</strong> {qa.a}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
