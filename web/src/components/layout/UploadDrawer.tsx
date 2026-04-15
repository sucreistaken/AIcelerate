import React, { useEffect, useRef } from "react";
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

/** Tab-key focus trap: tabbing past the last/first focusable wraps around. */
function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const node = containerRef.current;
    if (!node) return;

    function getFocusables(): HTMLElement[] {
      if (!node) return [];
      return Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("hidden") && el.offsetParent !== null);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusables = getFocusables();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }

    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [active, containerRef]);
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
  const asideRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useFocusTrap(asideRef, open);

  // Remember the element that opened the drawer so we can restore focus on close.
  useEffect(() => {
    if (open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
    } else if (restoreFocusRef.current && typeof restoreFocusRef.current.focus === "function") {
      restoreFocusRef.current.focus();
      restoreFocusRef.current = null;
    }
  }, [open]);

  // Move focus into the drawer on open (first focusable, typically close button).
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const first = asideRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Escape closes the drawer. Listen on document so focus can be anywhere in
  // the drawer subtree.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
            aria-hidden="true"
          />
          <motion.aside
            ref={asideRef}
            className="upload-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            role="dialog"
            aria-modal="true"
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
