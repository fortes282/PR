"use client";

import { Modal } from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  confirmDisabled?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Potvrdit",
  cancelLabel = "Zrušit",
  variant = "primary",
  confirmDisabled = false,
}: ConfirmDialogProps): React.ReactElement | null {
  const handleConfirm = (): void => {
    onConfirm();
    // Parent is responsible for calling onClose() after async work (e.g. after success).
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-gray-700">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={confirmDisabled}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={variant === "danger" ? "btn btn-danger" : "btn btn-primary"}
          onClick={handleConfirm}
          disabled={confirmDisabled}
        >
          {confirmDisabled ? (
            <span className="inline-flex items-center gap-2">
              <span className="spinner" aria-hidden />
              {confirmLabel}
            </span>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </Modal>
  );
}
