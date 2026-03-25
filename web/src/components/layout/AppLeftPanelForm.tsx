import React from "react";
import { motion } from "framer-motion";
import CollapsibleSection from "./CollapsibleSection";
import CourseInfoSection from "./CourseInfoSection";
import { ProgressStepper } from "../ui/ProgressStepper";
import { formatSeconds as fmtTime } from "../../utils/formatters";

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
  // No lesson selected → show empty state with wizard link
  if (!lesson.currentLessonId) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>📚</div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Ders seçilmedi</div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
          Bir ders seçin veya yeni ders oluşturmak için wizard'ı kullanın.
        </p>
        {onGoToWizard && (
          <button
            className="btn btn-primary"
            onClick={onGoToWizard}
            style={{ fontSize: 13 }}
          >
            + Yeni Ders Oluştur
          </button>
        )}
      </div>
    );
  }

  // Lesson selected → show material status + update options
  return (
    <>
      {/* Material status cards */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
          Materyaller
        </div>
        <MaterialStatus
          label="Slaytlar"
          icon="📄"
          hasContent={!!lesson.slidesText.trim()}
          charCount={lesson.slidesText.trim().length}
        />
        <MaterialStatus
          label="Transkript"
          icon="🎙️"
          hasContent={!!lesson.lectureText.trim()}
          charCount={lesson.lectureText.trim().length}
          style={{ marginTop: 6 }}
        />
      </div>

      <form
        className="lc-sidebar-form"
        onSubmit={onSubmit}
        aria-label="Material update form"
      >
        <CourseInfoSection lesson={lesson} ui={ui} />

        <SlidesSection
          slidesText={lesson.slidesText}
          onSlidesChange={(v) => lesson.setSlidesText(v)}
          onPdfUpload={onPdfUpload}
          isLoading={ui.isLoading}
          loadingMessage={ui.loadingMessage}
        />

        <TranscriptSection
          lectureText={lesson.lectureText}
          onLectureChange={(v) => lesson.setLectureText(v)}
          onAudioUpload={onAudioUpload}
          transcription={transcription}
        />

        <ReanalyzeActions
          canSubmit={canSubmit}
          isLoading={ui.isLoading}
          error={lesson.error}
        />
      </form>
    </>
  );
}

function MaterialStatus({ label, icon, hasContent, charCount, style }: {
  label: string; icon: string; hasContent: boolean; charCount: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
      borderRadius: 8, background: hasContent ? "var(--success-soft, rgba(34,197,94,.08))" : "var(--card-hover, #f4f4f6)",
      fontSize: 12, ...style,
    }}>
      <span>{icon}</span>
      <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
      <span style={{ color: hasContent ? "var(--success)" : "var(--muted)", fontWeight: 600, fontSize: 11 }}>
        {hasContent ? `✓ ${charCount.toLocaleString()} karakter` : "— Yok"}
      </span>
    </div>
  );
}

function SlidesSection({
  slidesText, onSlidesChange, onPdfUpload, isLoading, loadingMessage,
}: {
  slidesText: string; onSlidesChange: (v: string) => void;
  onPdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean; loadingMessage: string | null;
}) {
  return (
    <CollapsibleSection
      title="Slayt Güncelle"
      summary={slidesText.trim() ? `${slidesText.trim().length.toLocaleString()} karakter` : "Boş"}
      defaultOpen={!slidesText.trim()}
    >
      <div className="flex-between mb-2">
        <label className="label m-0">Slayt</label>
        <div className="file-upload-wrapper">
          <label htmlFor="pdf-upload" className="btn-small">PDF Yükle</label>
          <input id="pdf-upload" type="file" accept=".pdf" onChange={onPdfUpload} style={{ display: "none" }} />
          {isLoading && loadingMessage?.includes("PDF") && (
            <div className="mt-2">
              <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden", width: "100%" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                  style={{ height: "100%", background: "var(--accent-2)", borderRadius: 2 }}
                />
              </div>
              <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: "center" }}>{loadingMessage}</div>
            </div>
          )}
        </div>
      </div>
      <textarea
        className="lc-textarea textarea"
        value={slidesText}
        onChange={(e) => onSlidesChange(e.target.value)}
        placeholder="Slayt içeriği burada görünecek..."
        rows={6}
        aria-label="Slide content"
      />
    </CollapsibleSection>
  );
}

function TranscriptSection({
  lectureText, onLectureChange, onAudioUpload, transcription,
}: {
  lectureText: string; onLectureChange: (v: string) => void;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  transcription: LeftPanelTranscriptionProps;
}) {
  return (
    <CollapsibleSection
      title="Transkript Güncelle"
      summary={lectureText.trim() ? `${lectureText.trim().length.toLocaleString()} karakter` : "Boş"}
      defaultOpen={!lectureText.trim()}
    >
      <label className="label">Ses Dosyası</label>
      <div className="stt-row">
        <div className="stt-left">
          <span className="stt-hint">
            {transcription.stt.status || "Manuel olarak düzenleyebilirsiniz."}
            {transcription.stt.now && (
              <span className="stt-now">
                {fmtTime(transcription.stt.now.start)}–{fmtTime(transcription.stt.now.end)}
              </span>
            )}
          </span>
        </div>
        <div className="stt-right">
          <label className="stt-upload" htmlFor="audio-upload" title="Ses yükle ve transkribe et">Ses Yükle</label>
          <button type="button" className="stt-clear" onClick={transcription.clearTranscription} title="Temizle">Temizle</button>
          <input id="audio-upload" type="file" accept=".mp3,.wav,.m4a,.flac,.ogg" onChange={onAudioUpload} style={{ display: "none" }} />
        </div>
      </div>
      <div className="stt-progress" aria-hidden={transcription.stt.progress <= 0}>
        <div className="stt-progress-bar" style={{ width: `${transcription.stt.progress}%` }} />
      </div>
      <textarea
        className="lc-textarea textarea"
        value={lectureText}
        onChange={(e) => onLectureChange(e.target.value)}
        placeholder="Transkript metni..."
        rows={6}
        aria-label="Transcript"
      />
    </CollapsibleSection>
  );
}

function ReanalyzeActions({ canSubmit, isLoading, error }: {
  canSubmit: boolean; isLoading: boolean; error: string | null;
}) {
  return (
    <div className="actions actions--sticky">
      <button
        type="submit"
        disabled={!canSubmit}
        className={canSubmit ? "btn" : "btn btn--disabled"}
        aria-busy={isLoading}
        style={{ width: "100%", padding: "12px" }}
      >
        {isLoading ? "Analiz ediliyor..." : "Yeniden Analiz Et"}
      </button>
      <ProgressStepper isActive={isLoading} />
      {!canSubmit && !isLoading && (
        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>
          Slayt veya transkript alanlarını doldurun
        </div>
      )}
      {canSubmit && !isLoading && (
        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 6 }}>
          Materyalleri güncelledikten sonra yeniden analiz edin
        </div>
      )}
      {error && (
        <div className="error mt-2 text-red-500 text-sm" role="alert">{error}</div>
      )}
    </div>
  );
}
