import React, { useCallback } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./Modal";
import { Button } from "./Button";

export interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
}: ConfirmModalProps) {
  const handleConfirm = useCallback(() => {
    if (!loading) onConfirm();
  }, [onConfirm, loading]);

  const variantColor = variant === "danger"
    ? "var(--danger)"
    : variant === "warning"
    ? "var(--warning)"
    : "var(--accent-2)";

  const variantBg = variant === "danger"
    ? "var(--danger-soft)"
    : variant === "warning"
    ? "var(--warning-soft)"
    : undefined;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm" closeOnBackdropClick={!loading}>
      <ModalHeader onClose={onCancel}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {variant === "danger" && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={variantColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )}
          {variant === "warning" && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={variantColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
          {title}
        </span>
      </ModalHeader>
      <ModalBody>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          {message}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={loading}
          style={{
            background: variantColor,
            borderColor: variantColor,
            color: "#fff",
            ...(variantBg ? {} : {}),
          }}
        >
          {loading ? "..." : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// Hook for easy confirm modal state management
export function useConfirmModal() {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "default";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const confirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      variant?: "danger" | "warning" | "default";
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          isOpen: true,
          ...opts,
          onConfirm: () => {
            setState((s) => ({ ...s, isOpen: false }));
            resolve(true);
          },
        });
      });
    },
    []
  );

  const cancel = useCallback(() => {
    setState((s) => ({ ...s, isOpen: false }));
  }, []);

  const modalProps: ConfirmModalProps = {
    isOpen: state.isOpen,
    onConfirm: state.onConfirm,
    onCancel: cancel,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    cancelLabel: state.cancelLabel,
    variant: state.variant,
  };

  return { confirm, modalProps };
}
