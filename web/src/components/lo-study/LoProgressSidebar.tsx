type Props = {
  progress: number;
  completedCount: number;
  totalCount: number;
  completedTime: number;
  totalTime: number;
  pdfLoading: boolean;
  onExportPdf: () => void;
};

export default function LoProgressSidebar({
  progress,
  completedCount,
  totalCount,
  completedTime,
  totalTime,
  pdfLoading,
  onExportPdf,
}: Props) {
  return (
    <div className="lc-section" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: `conic-gradient(${progress === 100 ? "#22c55e" : "var(--accent-2)"} ${progress * 3.6}deg, var(--border) 0deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {progress}%
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, opacity: 0.6 }}>Progress</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>
            {completedCount}/{totalCount}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>
            {completedTime}/{totalTime} min
          </div>
        </div>
      </div>
      <button
        className="btn btn-secondary"
        onClick={onExportPdf}
        disabled={pdfLoading}
        style={{ marginTop: 8, fontSize: 12, width: "100%" }}
      >
        {pdfLoading ? "Exporting..." : "PDF Export"}
      </button>
    </div>
  );
}
