import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Mic,
  Upload,
  ArrowRight,
  Check,
  AlertCircle,
  RotateCcw,
  Loader2,
} from "lucide-react";
import CourseInfoSection from "./CourseInfoSection";
import { formatSeconds as fmtTime } from "../../utils/formatters";
import { t } from "../../utils/i18n";
import "../../styles/components/upload-drawer.css";

export interface LeftPanelLessonProps {
  currentLessonId: string | null;
  courseCode: string;
  setCourseCode: (v: string) => void;
  learningOutcomes: string[];
  fetchLearningOutcomes: () => void;
  analyzeDeviation: () => void;
  alignWithLO: () => void;
  generateLoModules: () => void;
  slidesText: string;
  setSlidesText: (v: string) => void;
  lectureText: string;
  setLectureText: (v: string) => void;
  error: string | null;
}

export interface LeftPanelUiProps {
  isLoading: boolean;
  loadingMessage: string | null;
  loLoading: boolean;
  devLoading: boolean;
  devErr: string | null;
  loModulesLoading: boolean;
}

export interface LeftPanelTranscriptionProps {
  stt: {
    progress: number;
    status: string | null;
    now: { start: number; end: number } | null;
    toast: string | null;
  };
  clearTranscription: () => void;
}

interface AppLeftPanelFormProps {
  lesson: LeftPanelLessonProps;
  ui: LeftPanelUiProps;
  transcription: LeftPanelTranscriptionProps;
  canSubmit: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onPdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGoToWizard?: () => void;
}

/**
 * At any moment the drawer should show AT MOST ONE progress signal in the
 * masthead. Precedence: in-flight transcription (has real % progress) beats
 * any other async op (indeterminate bar). This eliminates the "multiple
 * stacked checkmarks" bug seen with the previous per-section steppers.
 */
type ActiveOp = { label: string; indeterminate: boolean; progress?: number };

function pickActiveOp(
  ui: LeftPanelUiProps,
  tx: LeftPanelTranscriptionProps
): ActiveOp | null {
  if (tx.stt.progress > 0 && tx.stt.progress < 100 && tx.stt.status) {
    return {
      label: tx.stt.status,
      indeterminate: false,
      progress: tx.stt.progress,
    };
  }
  if (ui.isLoading) {
    return {
      label: ui.loadingMessage || t("leftPanel.analyzing"),
      indeterminate: true,
    };
  }
  return null;
}

export default function AppLeftPanelForm({
  lesson,
  ui,
  transcription,
  canSubmit,
  onSubmit,
  onPdfUpload,
  onAudioUpload,
  onGoToWizard,
}: AppLeftPanelFormProps) {
  if (!lesson.currentLessonId) {
    return (
      <div className="ingest-empty">
        <div className="ingest-empty__icon">
          <FileText size={28} strokeWidth={1.4} />
        </div>
        <h3 className="ingest-empty__title">{t("leftPanel.noLessonSelected")}</h3>
        <p className="ingest-empty__desc">{t("leftPanel.noLessonDesc")}</p>
        {onGoToWizard && (
          <button
            type="button"
            className="ingest-btn ingest-btn--primary"
            onClick={onGoToWizard}
          >
            <span>{t("leftPanel.createLesson")}</span>
            <ArrowRight size={14} strokeWidth={2.2} />
          </button>
        )}
      </div>
    );
  }

  const slideChars = lesson.slidesText.trim().length;
  const lectureChars = lesson.lectureText.trim().length;
  const hasSlides = slideChars > 0;
  const hasTranscript = lectureChars > 0;
  const activeOp = pickActiveOp(ui, transcription);

  return (
    <form
      className="ingest"
      onSubmit={onSubmit}
      aria-label="Material update form"
    >
      <IndicatorBar op={activeOp} />

      {/* Section 01 — Materials ledger (at-a-glance status) */}
      <section className="ingest-section">
        <div className="ingest-eyebrow">{t("leftPanel.materials")}</div>
        <div className="ingest-ledger">
          <LedgerRow
            icon={<FileText size={13} strokeWidth={1.8} />}
            label={t("leftPanel.slides")}
            chars={slideChars}
            has={hasSlides}
          />
          <LedgerRow
            icon={<Mic size={13} strokeWidth={1.8} />}
            label={t("leftPanel.transcript")}
            chars={lectureChars}
            has={hasTranscript}
            optional
          />
        </div>
      </section>

      {/* Section 02 — Course info */}
      <section className="ingest-section">
        <div className="ingest-eyebrow">{t("courseInfo.title")}</div>
        <div className="ingest-course">
          <CourseInfoSection lesson={lesson} ui={ui} />
        </div>
      </section>

      {/* Section 03 — Slides (update) */}
      <section className="ingest-section">
        <div className="ingest-eyebrow">{t("leftPanel.updateSlides")}</div>
        <div className="ingest-row">
          <label htmlFor="pdf-upload" className="ingest-btn ingest-btn--ghost">
            <Upload size={13} strokeWidth={2} />
            <span>{t("leftPanel.uploadPdfBtn")}</span>
          </label>
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            onChange={onPdfUpload}
            hidden
          />
        </div>
        <textarea
          className="ingest-textarea"
          value={lesson.slidesText}
          onChange={(e) => lesson.setSlidesText(e.target.value)}
          placeholder={t("leftPanel.slidePlaceholder")}
          rows={5}
          aria-label="Slide content"
        />
      </section>

      {/* Section 04 — Transcript (optional) */}
      <section className="ingest-section">
        <div className="ingest-eyebrow">
          <span>{t("leftPanel.updateTranscript")}</span>
          <span className="ingest-tag">{t("common.optional")}</span>
        </div>
        <div className="ingest-row">
          <label htmlFor="audio-upload" className="ingest-btn ingest-btn--ghost">
            <Mic size={13} strokeWidth={2} />
            <span>{t("leftPanel.uploadAudioBtn")}</span>
          </label>
          <input
            id="audio-upload"
            type="file"
            accept=".mp3,.wav,.m4a,.flac,.ogg"
            onChange={onAudioUpload}
            hidden
          />
          <button
            type="button"
            className="ingest-btn ingest-btn--ghost"
            onClick={transcription.clearTranscription}
          >
            <RotateCcw size={13} strokeWidth={2} />
            <span>{t("leftPanel.clearBtn")}</span>
          </button>
        </div>
        {transcription.stt.now && (
          <div className="ingest-stt" aria-live="polite">
            <span>
              {fmtTime(transcription.stt.now.start)}–
              {fmtTime(transcription.stt.now.end)}
            </span>
            <span className="ingest-stt__pct">
              {Math.round(transcription.stt.progress)}%
            </span>
          </div>
        )}
        <textarea
          className="ingest-textarea"
          value={lesson.lectureText}
          onChange={(e) => lesson.setLectureText(e.target.value)}
          placeholder={t("leftPanel.transcriptPlaceholder")}
          rows={5}
          aria-label="Transcript"
        />
      </section>

      {/* Sticky footer — submit + hint */}
      <footer className="ingest-footer">
        {lesson.error && (
          <div className="ingest-error" role="alert">
            <AlertCircle size={13} strokeWidth={2} />
            <span>{lesson.error}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="ingest-btn ingest-btn--primary ingest-btn--full"
          aria-busy={ui.isLoading}
        >
          {ui.isLoading ? (
            <>
              <Loader2 size={14} strokeWidth={2.2} className="ingest-spin" />
              <span>{t("leftPanel.analyzing")}</span>
            </>
          ) : (
            <>
              <span>{t("leftPanel.reanalyze")}</span>
              <ArrowRight size={14} strokeWidth={2.2} />
            </>
          )}
        </button>
        <p className="ingest-hint">
          {ui.isLoading
            ? "\u00A0"
            : !canSubmit
              ? t("empty.noPlanHint")
              : t("leftPanel.reanalyzeHint")}
        </p>
      </footer>
    </form>
  );
}

/* ─────────────── Sub-components ─────────────── */

function LedgerRow({
  icon,
  label,
  chars,
  has,
  optional,
}: {
  icon: React.ReactNode;
  label: string;
  chars: number;
  has: boolean;
  optional?: boolean;
}) {
  return (
    <div className={`ingest-ledger__row${has ? " ingest-ledger__row--has" : ""}`}>
      <span className="ingest-ledger__icon">{icon}</span>
      <span className="ingest-ledger__label">
        {label}
        {optional && <span className="ingest-ledger__opt">· {t("common.optionalInline")}</span>}
      </span>
      <span className="ingest-ledger__val">
        {has ? (
          <>
            <Check size={11} strokeWidth={3} />
            <span>
              {chars.toLocaleString()} {t("leftPanel.chars")}
            </span>
          </>
        ) : (
          <span className="ingest-ledger__empty">— {t("leftPanel.none")}</span>
        )}
      </span>
    </div>
  );
}

function IndicatorBar({ op }: { op: ActiveOp | null }) {
  return (
    <AnimatePresence initial={false}>
      {op && (
        <motion.div
          className="ingest-indicator"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="ingest-indicator__label">{op.label}</div>
          <div className="ingest-indicator__bar">
            {op.indeterminate ? (
              <motion.div
                className="ingest-indicator__fill ingest-indicator__fill--indet"
                initial={{ x: "-40%" }}
                animate={{ x: "140%" }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : (
              <div
                className="ingest-indicator__fill"
                style={{ width: `${Math.max(2, op.progress ?? 0)}%` }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
