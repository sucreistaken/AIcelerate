import React, { useRef, useState, useCallback } from "react";
import { t } from "../../utils/i18n";

interface Props {
  slidesText: string;
  isUploading: boolean;
  pdfFileName: string | null;
  error: string | null;
  onPdfUpload: (file: File) => void;
  onSlidesTextChange: (text: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function SlidesUploadStep({
  slidesText, isUploading, pdfFileName, error,
  onPdfUpload, onSlidesTextChange, onNext, onBack,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<"upload" | "paste">(slidesText ? "paste" : "upload");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      onPdfUpload(file);
    }
  }, [onPdfUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPdfUpload(file);
      e.target.value = "";
    }
  }, [onPdfUpload]);

  return (
    <div className="wizard-step-card" style={{ maxWidth: 560 }}>
      <h3 className="wizard-step-card__title">{t("wizard.slidesTitle")}</h3>
      <p className="wizard-step-card__desc">
        {t("wizard.slidesDesc")}
      </p>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${mode === "upload" ? "btn-primary" : "btn-ghost"}`}
          style={{ fontSize: 12 }}
          onClick={() => setMode("upload")}
          type="button"
        >
          {t("wizard.uploadPdf")}
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
            onClick={() => fileRef.current?.click()}
          >
            {isUploading ? (
              <div style={{ position: "relative", zIndex: 1 }}>
                <span className="wizard-upload-zone__icon">⏳</span>
                <div className="wizard-upload-zone__title">{t("wizard.processingPdf")}</div>
                <div className="wizard-upload-zone__subtitle">{t("wizard.extractingOcr")}</div>
              </div>
            ) : pdfFileName ? (
              <div style={{ position: "relative", zIndex: 1 }}>
                <span className="wizard-upload-zone__icon">✅</span>
                <div className="wizard-upload-zone__title" style={{ color: "var(--success)" }}>{pdfFileName}</div>
                <div className="wizard-upload-zone__subtitle">
                  {slidesText.length.toLocaleString()} {t("wizard.charsExtracted")}
                </div>
              </div>
            ) : (
              <div style={{ position: "relative", zIndex: 1 }}>
                <span className="wizard-upload-zone__icon">📄</span>
                <div className="wizard-upload-zone__title">{t("wizard.dragDropPdf")}</div>
                <div className="wizard-upload-zone__subtitle">{t("wizard.orClickToSelect")}</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} style={{ display: "none" }} />
        </>
      )}

      {mode === "paste" && (
        <div className="wizard-field">
          <textarea
            className="input"
            value={slidesText}
            onChange={(e) => onSlidesTextChange(e.target.value)}
            placeholder={t("wizard.pasteSlides")}
            rows={10}
            style={{ width: "100%", resize: "vertical", fontFamily: "inherit", padding: "12px 14px" }}
          />
          {slidesText && (
            <div className="wizard-field__hint">
              {slidesText.length.toLocaleString()} {t("wizard.chars")}
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
        <button className="btn btn-primary" onClick={onNext} type="button" disabled={isUploading}>
          {slidesText ? t("wizard.next") : t("wizard.skip")}
        </button>
      </div>
    </div>
  );
}
