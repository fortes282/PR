"use client";

/**
 * Root error boundary. Catches errors in the root layout.
 * Must define its own <html> and <body>; replaces root layout when active.
 * Required by Next.js App Router to avoid "missing required error components".
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <html lang="cs">
      <body className="bg-surface-50 text-gray-900 antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
          <h1 className="text-xl font-bold">Něco se pokazilo</h1>
          <p className="mt-2 text-gray-600">{error.message}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Zkusit znovu
          </button>
        </main>
      </body>
    </html>
  );
}
