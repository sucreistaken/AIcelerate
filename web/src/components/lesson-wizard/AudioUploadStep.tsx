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
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h3 className="h3" style={{ marginBottom: 4 }}>{t("wizard.recordingTitle")}</h3>
      <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
        {t("wizard.recordingDesc")}
      </p>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isTranscribing && fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "var(--warning)" : "var(--border)"}`,
              borderRadius: 12,
              padding: "40px 24px",
              textAlign: "center",
              cursor: isTranscribing ? "default" : "pointer",
              background: isDragging ? "var(--warning-soft)" : "transparent",
              transition: "all 0.2s ease",
              marginBottom: 16,
            }}
          >
            {isTranscribing ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎙️</div>
                <div style={{ fontWeight: 500 }}>{t("wizard.transcribing")}</div>
                <div style={{ marginTop: 8 }}>
                  <div style={{
                    background: "var(--card-hover)",
                    borderRadius: 4,
                    height: 8,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      background: "linear-gradient(90deg, #FF9800, #FF5722)",
                      width: `${stt.progress}%`,
                      height: "100%",
                      borderRadius: 4,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                    {stt.status || `${stt.progress}%`}
                  </div>
                </div>
              </div>
            ) : isDone ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 500, color: "var(--success)" }}>
                  {t("wizard.transcriptionDone")}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
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
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🎙️</div>
                <div style={{ fontWeight: 500 }}>{t("wizard.dragDropAudio")}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {t("wizard.audioFormats")}
                </div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept={ACCEPTED} onChange={handleFileChange} style={{ display: "none" }} />
        </>
      )}

      {mode === "paste" && (
        <div style={{ marginBottom: 16 }}>
          <textarea
            className="input"
            value={lectureText}
            onChange={(e) => onLectureTextChange(e.target.value)}
            placeholder={t("wizard.pasteTranscript")}
            rows={10}
            style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }}
          />
          {lectureText && (
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              {lectureText.length.toLocaleString()} {t("wizard.chars")}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onBack} type="button">{t("wizard.back")}</button>
        <button className="btn btn-primary" onClick={onNext} type="button" disabled={isTranscribing}>
          {lectureText ? t("wizard.next") : t("wizard.skip")}
        </button>
      </div>
    </div>
  );
}
