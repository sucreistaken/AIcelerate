import type { ServerTemplate } from "../../../../types";
import { CHANNEL_TYPE_ICONS, TOOL_ICONS, type Step } from "../useCreateServer";

interface Props {
  name: string;
  color: string;
  isPublic: boolean;
  currentTemplate: ServerTemplate | undefined;
  error: string;
  loading: boolean;
  setStep: (s: Step) => void;
  handleClose: () => void;
  handleCreate: () => void;
}

export default function PreviewStep({
  name, color, isPublic, currentTemplate,
  error, loading, setStep, handleClose, handleCreate,
}: Props) {
  return (
    <>
      <button className="sh-back-btn" onClick={() => setStep("details")}>← Geri</button>

      <h3 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-lg)" }}>Önizleme</h3>
      <p style={{ opacity: 0.6, marginBottom: "var(--space-4)", fontSize: "var(--text-sm)" }}>
        Oluşturulacak araçlar:
      </p>

      <div className="sh-preview-server">
        <div className="sh-preview-server__header" style={{ background: color }}>
          <span>{name.charAt(0).toUpperCase()}</span>
          <strong>{name}</strong>
        </div>

        {currentTemplate?.categories.map((cat, catIdx) => (
          <div key={catIdx} className="sh-preview-category">
            <div className="sh-preview-category__name">{cat.name.toUpperCase()}</div>
            {cat.channels.map((ch, chIdx) => (
              <div key={chIdx} className="sh-preview-channel">
                <span className="sh-preview-channel__icon">
                  {ch.toolType
                    ? TOOL_ICONS[ch.toolType] || "#"
                    : CHANNEL_TYPE_ICONS[ch.type] || "#"}
                </span>
                <span>{ch.name}</span>
              </div>
            ))}
          </div>
        ))}

        {isPublic && (
          <div className="sh-preview-badge">Herkese Açık</div>
        )}
      </div>

      {error && <p style={{ color: "var(--danger)", marginBottom: 12 }}>{error}</p>}

      <div className="sh-modal-actions">
        <button className="btn btn--ghost" onClick={handleClose}>İptal</button>
        <button
          className="btn btn--primary"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "Oluşturuluyor..." : "Oluştur"}
        </button>
      </div>
    </>
  );
}
