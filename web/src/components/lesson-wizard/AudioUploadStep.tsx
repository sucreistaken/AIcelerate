import React, { useRef, useState, useCallback } from "react";
import type { SttProgress } from "../../stores/uiStore";
import { t } from "../../utils/i18n";

interface Props {
  lectureText: string;
  stt: SttProgress;
  error: string | null;
  onAudioUpload: (file: File) => void;
  onLectureTextChange: (text: string) => void;
  onClearTranscription: () => void;
  onNext: () => void;
  onBack: () => void;
}

const ACCEPTED = ".mp3,.wav,.m4a,.flac,.ogg";

export default function AudioUploadStep({
  lectureText, stt, error,
  onAudioUpload, onLectureTextChange, onClearTranscription, onNext, onBack,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<"upload" | "paste">(lectureText && !stt.progress ? "paste" : "upload");

  const isTranscribing = stt.progress !== undefined && stt.progress > 0 && stt.progress < 100;
  const isDone = stt.progress === 100;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onAudioUpload(file);
  }, [onAudioUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAudioUpload(file);
      e.target.value = "";
    }
  }, [onAudioUpload]);

  return (
    <div className="wizard-step-card" style={{ maxWidth: 560 }}>
      <h3 className="wizard-step-card__title">{t("wizard.recordingTitle")}</h3>
      <p className="wizard-step-card__desc">
        {t("wizard.recordingDesc")}
      </p>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${mode === "upload" ? "btn-primary" : "btn-ghost"}`}
          style={{ fontSize: 12 }}
          onClick={() => setMode("upload")}
          type="button"
        >
          {t("wizard.uploadAudio")}
        </button>
        <button
          className={`btn ${mode === "paste" ? "btn-primary" : "btn-ghost"}`}
          style={{ fontSize: 12 }}
          onClick={() => setMode("paste")}
          type="button"
        >
          {t("wizard.paste")}
        </button>
      </div>

      {mode === "upload" && (
        <>
          <div
            className={`wizard-upload-zone ${isDragging ? "wizard-upload-zone--dragging" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isTranscribing && fileRef.current?.click()}
            style={{ cursor: isTranscribing ? "default" : undefined }}
          >
            {isTranscribing ? (
              <div style={{ position: "relative", zIndex: 1 }}>
                <span className="wizard-upload-zone__icon">🎙️</span>
                <div className="wizard-upload-zone__title">{t("wizard.transcribing")}</div>
                <div style={{ marginTop: 12 }}>
                  <div style={{
                    background: "var(--card-hover)",
                    borderRadius: 6,
                    height: 8,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                      width: `${stt.progress}%`,
                      height: "100%",
                      borderRadius: 6,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                  <div className="wizard-upload-zone__subtitle" style={{ marginTop: 6 }}>
                    {stt.status || `${stt.progress}%`}
                  </div>
                </div>
              </div>
            ) : isDone ? (
              <div style={{ position: "relative", zIndex: 1 }}>
                <span className="wizard-upload-zone__icon">✅</span>
                <div className="wizard-upload-zone__title" style={{ color: "var(--success)" }}>
                  {t("wizard.transcriptionDone")}
                </div>
                <div className="wizard-upload-zone__subtitle">
                  {lectureText.length.toLocaleString()} {t("wizard.chars")}
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ marginTop: 8, fontSize: 11 }}
                  onClick={(e) => { e.stopPropagation(); onClearTranscription(); }}
                  type="button"
                >
                  {t("wizard.clearReupload")}
                </button>
              </div>
            ) : (
              <div style={{ position: "relative", zIndex: 1 }}>
                <span className="wizard-upload-zone__icon">🎙️</span>
                <div className="wizard-upload-zone__title">{t("wizard.dragDropAudio")}</div>
                <div className="wizard-upload-zone__subtitle">
                  {t("wizard.audioFormats")}
                </div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept={ACCEPTED} onChange={handleFileChange} style={{ display: "none" }} />
        </>
      )}

      {mode === "paste" && (
        <div className="wizard-field">
          <textarea
            className="input"
            value={lectureText}
            onChange={(e) => onLectureTextChange(e.target.value)}
            placeholder={t("wizard.pasteTranscript")}
            rows={10}
            style={{ width: "100%", resize: "vertical", fontFamily: "inherit", padding: "12px 14px" }}
          />
          {lectureText && (
            <div className="wizard-field__hint">
              {lectureText.length.toLocaleString()} {t("wizard.chars")}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="wizard-error">
          {error}
        </div>
      )}

      <div className="wizard-actions">
        <button className="btn btn-ghost" onClick={onBack} type="button">{t("wizard.back")}</button>
        <button className="btn btn-primary" onClick={onNext} type="button" disabled={isTranscribing}>
          {lectureText ? t("wizard.next") : t("wizard.skip")}
        </button>
      </div>
    </div>
  );
}
