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

      <div className="mb-4">
        <label className="sh-label">Görünürlük</label>
        <div className="sh-visibility-seg" role="radiogroup" aria-label="Görünürlük">
          <button
            type="button"
            role="radio"
            aria-checked={isPublic}
            className={`sh-visibility-seg__opt ${isPublic ? "sh-visibility-seg__opt--active" : ""}`}
            onClick={() => setIsPublic(true)}
          >
            <span className="sh-visibility-seg__title">Herkese Açık</span>
            <span className="sh-visibility-seg__desc">Herkes keşfedip katılabilir</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!isPublic}
            className={`sh-visibility-seg__opt ${!isPublic ? "sh-visibility-seg__opt--active" : ""}`}
            onClick={() => setIsPublic(false)}
          >
            <span className="sh-visibility-seg__title">Sadece Davet</span>
            <span className="sh-visibility-seg__desc">Yalnızca davet linkiyle</span>
          </button>
        </div>
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
