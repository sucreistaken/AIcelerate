import React from "react";
import { X, Database } from "lucide-react";
import AppLeftPanelForm from "./AppLeftPanelForm";
import { t } from "../../utils/i18n";
import type {
  LeftPanelLessonProps,
  LeftPanelUiProps,
  LeftPanelTranscriptionProps,
} from "./AppLeftPanelForm";

interface AppLeftPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  lesson: LeftPanelLessonProps;
  ui: LeftPanelUiProps;
  transcription: LeftPanelTranscriptionProps;
  canSubmit: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onPdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AppLeftPanel({
  collapsed,
  onToggle,
  lesson,
  ui,
  transcription,
  canSubmit,
  onSubmit,
  onPdfUpload,
  onAudioUpload,
}: AppLeftPanelProps) {
  if (collapsed) {
    return (
      <div className="lc-sidebar-mini">
        <button
          className="lc-sidebar-mini__btn"
          onClick={onToggle}
          title={t("leftPanel.openKB")}
          aria-label={t("leftPanel.openKB")}
        >
          <Database size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="lc-sidebar-drawer" role="complementary" aria-label="Lesson input panel">
      <div className="lc-sidebar-drawer__header">
        <div className="lc-sidebar-drawer__inner-title">
          <Database
            size={18}
            className="text-accent-2"
            style={{ color: "var(--accent-2)" }}
          />
          {t("kb.title")}
        </div>
        <button
          className="lc-sidebar-drawer__close"
          onClick={onToggle}
          title={t("leftPanel.collapsePanel")}
          aria-label={t("leftPanel.collapsePanel")}
        >
          <X size={18} />
        </button>
      </div>
      <div className="lc-sidebar-drawer__content">
        <AppLeftPanelForm
          lesson={lesson}
          ui={ui}
          transcription={transcription}
          canSubmit={canSubmit}
          onSubmit={onSubmit}
          onPdfUpload={onPdfUpload}
          onAudioUpload={onAudioUpload}
        />
      </div>
    </div>
  );
}
