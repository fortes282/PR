"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth/session";
import { getDefaultRoute } from "@/lib/auth/rbac";
import { useToast } from "@/components/layout/Toaster";
import type { Role } from "@/lib/contracts/auth";

const ROLES: Role[] = ["ADMIN", "RECEPTION", "EMPLOYEE", "CLIENT"];

export default function LoginPage(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [role, setRole] = useState<Role | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [credentialLoading, setCredentialLoading] = useState(false);
  const [credentialError, setCredentialError] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MODE !== "http") return;
    const useProxy = process.env.NEXT_PUBLIC_USE_API_PROXY === "true";
    const pingUrl = useProxy ? "/api/proxy/ping" : `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")}/ping`;
    if (pingUrl) fetch(pingUrl).catch(() => {});
    api.auth.me().then((res) => {
      if (res) {
        if ((res.user as { mustChangePassword?: boolean })?.mustChangePassword) {
          router.replace("/change-password");
        } else {
          router.replace(getDefaultRoute(res.session.role));
        }
      }
    });
  }, [router]);

  const handleDevLogin = async (): Promise<void> => {
    if (!role) return;
    setLoading(true);
    setError(null);
    try {
      const { user, session } = await api.auth.login({ role });
      setSession(session, user);
      if ((user as { mustChangePassword?: boolean })?.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push(getDefaultRoute(session.role));
      }
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Přihlášení selhalo";
      let hint = "";
      if (msg.includes("502") || msg.includes("Failed") || msg.includes("fetch")) {
        hint = " API může spát. Zkuste to znovu za 10–15 s.";
      } else if (msg.includes("Unauthorized") || msg.includes("401")) {
        hint = " API vrací 401 – prázdná DB? Restartuj API na Renderu nebo přidej persistent disk.";
      }
      const fullMsg = msg + hint;
      setError(fullMsg);
      toast(fullMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setCredentialLoading(true);
    setCredentialError(null);
    try {
      const { user, session } = await api.auth.login({
        email: email.trim(),
        password,
      });
      setSession(session, user);
      if ((user as { mustChangePassword?: boolean })?.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push(getDefaultRoute(session.role));
      }
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Přihlášení selhalo";
      setCredentialError(msg);
      toast(msg, "error");
    } finally {
      setCredentialLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-4">
      <div className="card w-full max-w-md p-6">
        <h1 className="text-xl font-bold text-primary-700">Přístav radosti</h1>
        <p className="mt-1 text-sm text-gray-600">Přihlášení</p>

        {/* Klasické přihlášení e-mail + heslo */}
        <section className="mt-6 border-b border-gray-200 pb-6">
          <h2 className="text-sm font-medium text-gray-700">E-mail a heslo</h2>
          <form onSubmit={handleCredentialLogin} className="mt-3 space-y-3">
            <label>
              <span className="sr-only">E-mail</span>
              <input
                type="email"
                className="input w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                required
                autoComplete="email"
              />
            </label>
            <label>
              <span className="sr-only">Heslo</span>
              <input
                type="password"
                className="input w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Heslo"
                required
                autoComplete="current-password"
              />
            </label>
            {credentialError && (
              <p className="text-sm text-red-600" role="alert">
                {credentialError}
              </p>
            )}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={credentialLoading}
            >
              {credentialLoading ? "Přihlašuji…" : "Přihlásit se"}
            </button>
          </form>
          <p className="mt-3 text-center text-sm">
            <Link href="/register" className="text-primary-600 hover:underline">
              Registrace klienta (e-mail + ověření SMS)
            </Link>
          </p>
        </section>

        {/* Demo přihlášení podle role */}
        <section className="mt-6">
          <h2 className="text-sm font-medium text-gray-700">Demo – přihlášení podle role</h2>
          <div className="mt-3">
            <label htmlFor="role" className="block text-sm text-gray-600">
              Vyberte roli
            </label>
            <select
              id="role"
              className="input mt-1 w-full"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              aria-label="Role pro demo přihlášení"
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
                API: {process.env.NEXT_PUBLIC_USE_API_PROXY === "true" ? "proxy" : process.env.NEXT_PUBLIC_API_BASE_URL || "(nevyplněno)"}
              </p>
            </div>
          )}
          <button
            type="button"
            className="btn-secondary mt-4 w-full"
            disabled={!role || loading}
            onClick={handleDevLogin}
          >
            {loading ? "Přihlašuji…" : "Přihlásit se (demo)"}
          </button>
        </section>
      </div>
      <Link href="/" className="mt-4 text-sm text-primary-600 hover:underline" prefetch={false}>
        Zpět na úvod
      </Link>
    </main>
  );
}
