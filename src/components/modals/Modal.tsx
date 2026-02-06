"use client";

import { useCallback, useEffect, useId, useState } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

const DURATION_MS = 200;

export function Modal({ open, onClose, title, children }: ModalProps): React.ReactElement | null {
  const titleId = useId();
  const descId = useId();
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) {
      setMounted(false);
      setExiting(false);
      return;
    }
    document.body.style.overflow = "hidden";
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true));
    });
    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = useCallback((): void => {
    setExiting(true);
    setTimeout(() => {
      onClose();
    }, DURATION_MS);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
    // handleClose is stable via useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, handleClose]);

  if (!open && !exiting) return null;

  const visible = mounted && !exiting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {/* Backdrop — fade */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-normal"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
        aria-hidden
      />
      {/* Panel — mobile: bottom sheet (translateY); desktop: center + scale/fade */}
      <div
        className={`
          card relative z-10 max-h-[90vh] w-full overflow-auto
          transition-all duration-normal
          max-sm:rounded-t-xl max-sm:border-t
          sm:max-w-lg
          ${visible ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-full opacity-0 sm:scale-95"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Zavřít"
            className="min-h-[44px] min-w-[44px] rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        <div id={descId} className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
