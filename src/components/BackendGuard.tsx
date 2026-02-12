"use client";

import { usePathname } from "next/navigation";
import { isBackendConfigured } from "@/lib/api";
import Link from "next/link";

type Props = { children: React.ReactNode };

/**
 * Když není nastaven NEXT_PUBLIC_API_MODE=http, zobrazí místo aplikace hlášku,
 * že backend neběží. Stránka /nasazeni je vždy dostupná.
 */
export function BackendGuard({ children }: Props): React.ReactElement {
  const pathname = usePathname();
  const allowWithoutBackend = pathname === "/nasazeni";
  if (isBackendConfigured || allowWithoutBackend) return <>{children}</>;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-6">
      <div className="card max-w-lg w-full p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900">Backend neběží</h1>
        <p className="mt-4 text-gray-700">
          Aplikace potřebuje připojený backend (API). Režim bez backendu (mock) není podporován.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          Nastavte <strong>NEXT_PUBLIC_API_MODE=http</strong> a <strong>NEXT_PUBLIC_API_BASE_URL</strong> (nebo proxy) a spusťte backend. Po změně env restartujte Next.js.
        </p>
        <div className="mt-6">
          <Link
            href="/nasazeni"
            className="text-primary-600 font-medium hover:underline"
          >
            Návod k nasazení →
          </Link>
        </div>
      </div>
    </main>
  );
}
