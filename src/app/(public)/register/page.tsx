"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth/session";
import { getDefaultRoute } from "@/lib/auth/rbac";

export default function RegisterPage(): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestSmsCode = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.auth.requestSmsCode({ phone: phone.trim(), purpose: "REGISTRATION" });
      setCodeSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nepodařilo se odeslat SMS kód");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email.trim() || !password || !name.trim()) return;
    if (!phone.trim()) {
      setError("Telefon je povinný. Vyplňte číslo a vyžádejte si SMS kód.");
      return;
    }
    if (!codeSent) {
      setError("Nejprve klikněte na „Odeslat SMS kód“ a zadejte kód z SMS.");
      return;
    }
    if (!smsCode.trim()) {
      setError("Zadejte kód z SMS.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { user, session } = await api.auth.register({
        email: email.trim(),
        password,
        name: name.trim(),
        phone: phone.trim(),
        smsCode: smsCode.trim(),
      });
      setSession(session, user);
      router.push(getDefaultRoute(session.role));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registrace selhala");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-50 p-4">
      <div className="card w-full max-w-md p-6">
        <h1 className="text-xl font-bold text-primary-700">Registrace klienta</h1>
        <p className="mt-1 text-sm text-gray-600">Vyplňte údaje. Telefon je povinný – ověříme ho kódem z SMS.</p>

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <label>
            <span className="block text-sm font-medium text-gray-700">E-mail *</span>
            <input type="email" className="input mt-1 w-full" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@example.cz" />
          </label>
          <label>
            <span className="block text-sm font-medium text-gray-700">Heslo * (min. 8 znaků)</span>
            <input type="password" className="input mt-1 w-full" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </label>
          <label>
            <span className="block text-sm font-medium text-gray-700">Jméno *</span>
            <input type="text" className="input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jan Novák" />
          </label>
          <label>
            <span className="block text-sm font-medium text-gray-700">Telefon * (ověříme SMS kódem)</span>
            <input
              type="tel"
              className="input mt-1 w-full"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setCodeSent(false); }}
              placeholder="+420 123 456 789"
              required
            />
          </label>
          <div className="flex flex-wrap gap-2 items-end">
            <button type="button" className="btn-secondary" disabled={loading || !phone.trim() || codeSent} onClick={handleRequestSmsCode}>
              {codeSent ? "Kód odeslán" : "Odeslat SMS kód"}
            </button>
            {codeSent && (
              <input
                type="text"
                className="input flex-1 min-w-[120px]"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
                placeholder="Kód z SMS (6 číslic)"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Registruji…" : "Registrovat"}
          </button>
        </form>
      </div>
      <Link href="/login" className="mt-4 text-sm text-primary-600 hover:underline" prefetch={false}>
        Už mám účet – přihlásit se
      </Link>
    </main>
  );
}
