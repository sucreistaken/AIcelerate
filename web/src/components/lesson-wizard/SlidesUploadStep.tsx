import React, { useRef, useState, useCallback } from "react";

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
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h3 className="h3" style={{ marginBottom: 4 }}>Slaytlar</h3>
      <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
        Ders slaytlarını PDF olarak yükleyin veya text olarak yapıştırın
      </p>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${mode === "upload" ? "btn-primary" : "btn-ghost"}`}
          style={{ fontSize: 12 }}
          onClick={() => setMode("upload")}
          type="button"
        >
          📄 PDF Yükle
        </button>
        <button
          className={`btn ${mode === "paste" ? "btn-primary" : "btn-ghost"}`}
          style={{ fontSize: 12 }}
          onClick={() => setMode("paste")}
          type="button"
        >
          📋 Yapıştır
        </button>
      </div>

      {mode === "upload" && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "var(--accent-2)" : "var(--border)"}`,
              borderRadius: 12,
              padding: "40px 24px",
              textAlign: "center",
              cursor: "pointer",
              background: isDragging ? "var(--ring)" : "transparent",
              transition: "all 0.2s ease",
              marginBottom: 16,
            }}
          >
            {isUploading ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <div style={{ fontWeight: 500 }}>PDF işleniyor...</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>OCR ile text çıkarılıyor</div>
              </div>
            ) : pdfFileName ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 500, color: "var(--success)" }}>{pdfFileName}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {slidesText.length.toLocaleString()} karakter çıkarıldı
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ fontWeight: 500 }}>PDF dosyasını sürükle-bırak</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>veya tıklayarak seç</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} style={{ display: "none" }} />
        </>
      )}

      {mode === "paste" && (
        <div style={{ marginBottom: 16 }}>
          <textarea
            className="input"
            value={slidesText}
            onChange={(e) => onSlidesTextChange(e.target.value)}
            placeholder="Slayt içeriğini buraya yapıştırın..."
            rows={10}
            style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }}
          />
          {slidesText && (
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              {slidesText.length.toLocaleString()} karakter
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
        <button className="btn btn-ghost" onClick={onBack} type="button">← Geri</button>
        <button className="btn btn-primary" onClick={onNext} type="button" disabled={isUploading}>
          {slidesText ? "İleri →" : "Atla →"}
        </button>
      </div>
    </div>
  );
}
