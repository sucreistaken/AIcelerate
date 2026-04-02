import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload } from "lucide-react";
import AppLeftPanelForm from "./AppLeftPanelForm";
import type {
  LeftPanelLessonProps,
  LeftPanelUiProps,
  LeftPanelTranscriptionProps,
} from "./AppLeftPanelForm";
import { t } from "../../utils/i18n";

interface UploadDrawerProps {
  open: boolean;
  onClose: () => void;
  lesson: LeftPanelLessonProps;
  ui: LeftPanelUiProps;
  transcription: LeftPanelTranscriptionProps;
  canSubmit: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onPdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function UploadDrawer({
  open,
  onClose,
  lesson,
  ui,
  transcription,
  canSubmit,
  onSubmit,
  onPdfUpload,
  onAudioUpload,
}: UploadDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="upload-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            className="upload-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            role="dialog"
            aria-label={t("sidebar.uploadMaterials")}
          >
            <div className="upload-drawer__header">
              <div className="upload-drawer__title">
                <Upload size={16} style={{ color: "var(--accent-2)" }} />
                {t("sidebar.uploadMaterials")}
              </div>
              <button
                className="upload-drawer__close"
                onClick={onClose}
                aria-label={t("common.close")}
              >
                <X size={16} />
              </button>
            </div>
            <div className="upload-drawer__content">
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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
