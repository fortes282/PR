"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

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

export function Toaster(): React.ReactElement {
  const ctx = useContext(ToastContext);
  const toasts = ctx?.toasts ?? [];
  const remove = ctx?.removeToast ?? (() => {});

  if (toasts.length === 0) return <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" />;

  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`rounded-lg border px-4 py-2 shadow-lg ${
            t.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : t.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-gray-200 bg-white text-gray-800"
          }`}
        >
          {t.message}
          <button
            type="button"
            aria-label="Zavřít"
            className="ml-2 text-gray-500 hover:text-gray-700"
            onClick={() => remove(t.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
