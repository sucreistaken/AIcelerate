import { BookOpen, GraduationCap, FolderKanban, Sparkles, ChevronRight, type LucideIcon } from "lucide-react";
import { BUILT_IN_TEMPLATES } from "../useCreateServer";

const TEMPLATE_ICON_MAP: Record<string, LucideIcon> = {
  "study-group": BookOpen,
  "exam-prep": GraduationCap,
  "project-group": FolderKanban,
};

interface Props {
  onSelectTemplate: (templateId: string | null) => void;
}

export default function PurposeStep({ onSelectTemplate }: Props) {
  return (
    <>
      <h3 className="sh-modal-step-title">Nasıl bir çalışma odası?</h3>
      <p className="sh-modal-step-desc">Bir şablon seç veya boş oda oluştur</p>

      <div className="sh-template-list" role="list">
        {BUILT_IN_TEMPLATES.map((tmpl) => {
          const Icon = TEMPLATE_ICON_MAP[tmpl.id] ?? Sparkles;
          return (
            <button
              type="button"
              key={tmpl.id}
              role="listitem"
              className="sh-template-card"
              onClick={() => onSelectTemplate(tmpl.id)}
            >
              <span className="sh-template-card__icon" aria-hidden="true">
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <span className="sh-template-card__info">
                <span className="sh-template-card__name">{tmpl.label}</span>
                <span className="sh-template-card__desc">{tmpl.description}</span>
              </span>
              <ChevronRight className="sh-template-card__arrow" size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          );
        })}
        <button
          type="button"
          role="listitem"
          className="sh-template-card sh-template-card--empty"
          onClick={() => onSelectTemplate(null)}
        >
          <span className="sh-template-card__icon" aria-hidden="true">
            <Sparkles size={16} strokeWidth={1.75} />
          </span>
          <span className="sh-template-card__info">
            <span className="sh-template-card__name">Boş Oda</span>
            <span className="sh-template-card__desc">Sıfırdan başla, kendi araçlarını ekle</span>
          </span>
          <ChevronRight className="sh-template-card__arrow" size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
