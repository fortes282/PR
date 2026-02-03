"use client";

/**
 * Route segment error boundary. Catches errors in the app and shows fallback UI.
 * Required by Next.js App Router to avoid "missing required error components".
 */
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-4">
      <h1 className="text-xl font-bold text-gray-900">Něco se pokazilo</h1>
      <p className="mt-2 text-gray-600">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="btn-primary mt-4"
      >
        Zkusit znovu
      </button>
    </main>
  );
}
