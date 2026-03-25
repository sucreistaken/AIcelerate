import { BUILT_IN_TEMPLATES, TEMPLATE_ICONS } from "../useCreateServer";

interface Props {
  onSelectTemplate: (templateId: string | null) => void;
}

export default function PurposeStep({ onSelectTemplate }: Props) {
  return (
    <>
      <h3 style={{ margin: "0 0 4px", fontSize: "var(--text-lg)" }}>Nasıl bir çalışma odası oluşturmak istiyorsunuz?</h3>
      <p style={{ opacity: 0.6, marginBottom: "var(--space-4)", fontSize: "var(--text-sm)" }}>
        Bir şablon seçin veya boş oda oluşturun
      </p>

      <div className="sh-template-list">
        {BUILT_IN_TEMPLATES.map((tmpl) => (
          <div
            key={tmpl.id}
            className="sh-template-card"
            onClick={() => onSelectTemplate(tmpl.id)}
          >
            <span className="sh-template-card__icon">{TEMPLATE_ICONS[tmpl.id] || "#"}</span>
            <div className="sh-template-card__info">
              <span className="sh-template-card__name">{tmpl.label}</span>
              <span className="sh-template-card__desc">{tmpl.description}</span>
            </div>
            <span className="sh-template-card__arrow">→</span>
          </div>
        ))}
        <div
          className="sh-template-card sh-template-card--empty"
          onClick={() => onSelectTemplate(null)}
        >
          <span className="sh-template-card__icon">+</span>
          <div className="sh-template-card__info">
            <span className="sh-template-card__name">Boş Oda</span>
            <span className="sh-template-card__desc">Sıfırdan başla, kendi araçlarını ekle</span>
          </div>
          <span className="sh-template-card__arrow">→</span>
        </div>
      </div>
    </>
  );
}
