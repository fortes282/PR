/**
 * Offline fallback page. Shown when user is offline and requested page is not cached.
 */
import Link from "next/link";

export default function OfflinePage(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-4">
      <h1 className="text-xl font-bold text-gray-900">Jste offline</h1>
      <p className="mt-2 text-gray-600">Připojte se k internetu a zkuste znovu.</p>
      <Link href="/" className="btn-primary mt-4">
        Obnovit
      </Link>
    </main>
  );
}
