"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, AlertCircle, Info, X } from "lucide-react";

type Toast = { id: string; message: string; type?: "success" | "error" | "info" };

const ToastContext = createContext<{
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
} | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const value = useMemo(() => ({ toasts, addToast, removeToast }), [toasts, addToast, removeToast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string, type?: Toast["type"]) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) return () => {};
  return ctx.addToast;
}

function ToastIcon({ type }: { type: Toast["type"] }): React.ReactElement {
  const t = type ?? "info";
  if (t === "success")
    return <Check className="h-5 w-5 shrink-0 text-success-600" aria-hidden />;
  if (t === "error")
    return <AlertCircle className="h-5 w-5 shrink-0 text-error-600" aria-hidden />;
  return <Info className="h-5 w-5 shrink-0 text-primary-500" aria-hidden />;
}

export function Toaster(): React.ReactElement {
  const ctx = useContext(ToastContext);
  const toasts = ctx?.toasts ?? [];
  const remove = ctx?.removeToast ?? (() => {});

  if (toasts.length === 0) {
    return (
      <div
        aria-live="polite"
        className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 md:bottom-4"
      />
    );
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col gap-2 md:bottom-4 md:max-w-sm"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            role="alert"
            layout
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${
              t.type === "error"
                ? "border-error-100 bg-error-50 text-error-600"
                : t.type === "success"
                  ? "border-success-100 bg-success-50 text-success-700"
                  : "border-gray-200 bg-white text-gray-800"
            }`}
          >
            <ToastIcon type={t.type} />
            <p className="min-w-0 flex-1 text-sm font-medium">{t.message}</p>
            <button
              type="button"
              aria-label="Zavřít"
              className="shrink-0 rounded p-1 text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={() => remove(t.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
