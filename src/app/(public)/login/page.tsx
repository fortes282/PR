"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth/session";
import { getDefaultRoute } from "@/lib/auth/rbac";
import type { Role } from "@/lib/contracts/auth";

const ROLES: Role[] = ["ADMIN", "RECEPTION", "EMPLOYEE", "CLIENT"];

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const [role, setRole] = useState<Role | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
    if (baseUrl && process.env.NEXT_PUBLIC_API_MODE === "http") {
      fetch(`${baseUrl}/ping`).catch(() => {});
    }
    api.auth.me().then((res) => {
      if (res) router.replace(getDefaultRoute(res.session.role));
    });
  }, [router]);

  const handleDevLogin = async (): Promise<void> => {
    if (!role) return;
    setLoading(true);
    setError(null);
    try {
      const { user, session } = await api.auth.login({ role });
      setSession(session, user);
      router.push(getDefaultRoute(session.role));
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Přihlášení selhalo";
      const hint = msg.includes("502") || msg.includes("Failed") || msg.includes("fetch")
        ? " API může spát (Railway). Zkuste to znovu za 10–15 s."
        : "";
      setError(msg + hint);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-4">
      <div className="card w-full max-w-md p-6">
        <h1 className="text-xl font-bold text-primary-700">Pristav Radosti</h1>
        <p className="mt-1 text-sm text-gray-600">Přihlášení (demo)</p>

        {/* Dev role-based login */}
        <div className="mt-6">
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Vyberte roli (dev)
          </label>
          <select
            id="role"
            className="input mt-1"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="">— vyberte —</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mt-2 space-y-1" role="alert">
            <p className="text-sm text-red-600">{error}</p>
            <p className="text-xs text-gray-500">
              API: {process.env.NEXT_PUBLIC_API_MODE === "http" ? "HTTP" : "mock"} →{" "}
              {process.env.NEXT_PUBLIC_API_MODE === "http"
                ? process.env.NEXT_PUBLIC_API_BASE_URL || "(nevyplněno)"
                : "lokální mock"}
            </p>
          </div>
        )}

        <button
          type="button"
          className="btn-primary mt-4 w-full"
          disabled={!role || loading}
          onClick={handleDevLogin}
        >
          {loading ? "Přihlašuji…" : "Přihlásit se"}
        </button>

        {/* Future: credential login form placeholder */}
        <p className="mt-4 text-center text-xs text-gray-500">
          Backend: přidejte formulář email + heslo a volajte POST /auth/login.
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/register" className="text-primary-600 hover:underline">Registrace klienta</Link>
        </p>
      </div>
      <Link href="/" className="mt-4 text-sm text-primary-600 hover:underline" prefetch={false}>
        Zpět na úvod
      </Link>
    </main>
  );
}
