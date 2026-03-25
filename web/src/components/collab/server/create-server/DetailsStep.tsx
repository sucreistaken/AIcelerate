import { COLORS } from "../useCreateServer";
import type { Step } from "../useCreateServer";

interface Props {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  university: string;
  setUniversity: (v: string) => void;
  tagsInput: string;
  setTagsInput: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
  selectedTemplate: string | null;
  error: string;
  loading: boolean;
  setStep: (s: Step) => void;
  handleClose: () => void;
  handleCreate: () => void;
}

export default function DetailsStep({
  name, setName,
  description, setDescription,
  university, setUniversity,
  tagsInput, setTagsInput,
  color, setColor,
  isPublic, setIsPublic,
  selectedTemplate,
  error, loading,
  setStep, handleClose, handleCreate,
}: Props) {
  return (
    <>
      <button className="sh-back-btn" onClick={() => setStep("purpose")}>← Geri</button>

      <div className="mb-3">
        <label className="sh-label">Oda Adı</label>
        <input
          className="input w-full"
          placeholder="Ör: Matematik 101 - 2025 Bahar"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          autoFocus
        />
      </div>

      <div className="mb-3">
        <label className="sh-label">Açıklama (opsiyonel)</label>
        <textarea
          className="lc-textarea w-full"
          placeholder="Bu sunucu ne hakkında?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={200}
        />
      </div>

      <div className="mb-3">
        <label className="sh-label">Üniversite (opsiyonel)</label>
        <input
          className="input w-full"
          placeholder="Ör: İTÜ, ODTÜ, Boğaziçi"
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          maxLength={50}
        />
      </div>

      <div className="mb-3">
        <label className="sh-label">Etiketler (virgülle ayırın)</label>
        <input
          className="input w-full"
          placeholder="Ör: matematik, lineer cebir, mühendislik"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          maxLength={100}
        />
      </div>

      <div className="mb-3">
        <label className="sh-label">Renk</label>
        <div className="sh-color-picker">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`sh-color-swatch ${color === c ? "sh-color-swatch--active" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="mb-4 sh-toggle-row">
        <label className="sh-label" style={{ marginBottom: 0 }}>Herkese Açık</label>
        <button
          type="button"
          className={`sh-toggle ${isPublic ? "sh-toggle--active" : ""}`}
          onClick={() => setIsPublic(!isPublic)}
        >
          <span className="sh-toggle__knob" />
        </button>
        <span style={{ fontSize: "var(--text-xs)", opacity: 0.5 }}>
          {isPublic ? "Herkes keşfedebilir ve katılabilir" : "Sadece davet ile katılım"}
        </span>
      </div>

      {error && <p style={{ color: "var(--danger)", marginBottom: 12 }}>{error}</p>}

      <div className="sh-modal-actions">
        <button className="btn btn--ghost" onClick={handleClose}>İptal</button>
        {selectedTemplate ? (
          <button
            className="btn btn--primary"
            onClick={() => setStep("preview")}
            disabled={!name.trim()}
          >
            Önizle
          </button>
        ) : (
          <button
            className="btn btn--primary"
            onClick={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading ? "Oluşturuluyor..." : "Oluştur"}
          </button>
        )}
      </div>
    </>
  );
}
