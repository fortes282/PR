"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession, getUser, setSession } from "@/lib/auth/session";
import { getDefaultRoute } from "@/lib/auth/rbac";
import { useToast } from "@/components/layout/Toaster";

export default function ChangePasswordPage(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MODE !== "http") {
      setChecking(false);
      return;
    }
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    api.auth.me().then((res) => {
      setChecking(false);
      if (!res) {
        router.replace("/login");
        return;
      }
      if (!(res.user as { mustChangePassword?: boolean })?.mustChangePassword) {
        router.replace(getDefaultRoute(res.session.role));
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast("Nové heslo musí mít alespoň 8 znaků.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("Nové heslo a potvrzení se neshodují.", "error");
      return;
    }
    setLoading(true);
    try {
      await api.auth.changePassword({
        currentPassword,
        newPassword,
      });
      const res = await api.auth.me();
      if (res) {
        setSession(res.session, res.user);
      }
      toast("Heslo bylo změněno.", "success");
      router.replace(getDefaultRoute(getSession()?.role ?? "CLIENT"));
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Změna hesla selhala.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-4">
        <p className="text-gray-600">Kontroluji přihlášení…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-4">
      <div className="card w-full max-w-md p-6">
        <h1 className="text-xl font-bold text-primary-700">Změna hesla</h1>
        <p className="mt-1 text-sm text-gray-600">
          Po prvním přihlášení je nutné nastavit nové heslo.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label>
            <span className="block text-sm font-medium text-gray-700">Aktuální heslo</span>
            <input
              type="password"
              className="input mt-1 w-full"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              aria-label="Aktuální heslo"
            />
          </label>
          <label>
            <span className="block text-sm font-medium text-gray-700">Nové heslo (min. 8 znaků)</span>
            <input
              type="password"
              className="input mt-1 w-full"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              aria-label="Nové heslo"
            />
          </label>
          <label>
            <span className="block text-sm font-medium text-gray-700">Potvrzení nového hesla</span>
            <input
              type="password"
              className="input mt-1 w-full"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              aria-label="Potvrzení nového hesla"
            />
          </label>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Ukládám…" : "Změnit heslo"}
          </button>
        </form>
      </div>
    </main>
  );
}
