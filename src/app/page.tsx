import Link from "next/link";

/**
 * Root page: redirect to login or dashboard based on session.
 * Backend: no API; client-side session check only.
 */
export default function HomePage(): React.ReactElement {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-50 p-4">
      <h1 className="text-2xl font-bold text-primary-700 mb-4">Pristav Radosti</h1>
      <p className="text-gray-600 mb-6">Rehab Center Management</p>
      <Link href="/login" className="btn-primary">
        Přihlásit se
      </Link>
    </main>
  );
}
