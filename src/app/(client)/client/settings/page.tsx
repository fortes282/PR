"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth/useSession";
import { api } from "@/lib/api";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push/subscribe";
import type { User, NotificationPreferences } from "@/lib/contracts/users";

const defaultPrefs: NotificationPreferences = {
  emailReminder1: true,
  emailReminder2: true,
  smsReminder: false,
  emailMarketing: false,
  smsMarketing: false,
  pushAppointmentReminder: true,
  pushMarketing: false,
};

export default function ClientSettingsPage(): React.ReactElement {
  const { session, user: initialUser, mounted } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPrefs);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "loading" | "subscribed" | "error">("idle");
  const [pushError, setPushError] = useState<string | null>(null);

  const loadUser = useCallback(() => {
    if (!session?.userId) return;
    api.users.get(session.userId).then((u) => {
      if (u) {
        setUser(u);
        setPrefs(u.notificationPreferences ? { ...defaultPrefs, ...u.notificationPreferences } : defaultPrefs);
      }
    });
  }, [session?.userId]);

  const checkPushSubscription = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => {
      setPushStatus(sub ? "subscribed" : "idle");
    });
  }, []);

  useEffect(() => {
    if (mounted) checkPushSubscription();
  }, [mounted, checkPushSubscription]);

  const handleEnablePush = async (): Promise<void> => {
    setPushStatus("loading");
    setPushError(null);
    const result = await subscribeToPush();
    if (result.ok) {
      setPushStatus("subscribed");
    } else {
      setPushStatus("error");
      setPushError(result.error);
    }
  };

  const handleDisablePush = async (): Promise<void> => {
    setPushStatus("loading");
    setPushError(null);
    await unsubscribeFromPush();
    setPushStatus("idle");
  };

  useEffect(() => {
    if (mounted && session?.userId) loadUser();
  }, [mounted, session?.userId, loadUser]);

  const updatePref = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ): void => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updated = await api.users.update(user.id, { notificationPreferences: prefs });
      setUser(updated);
      setPrefs(updated.notificationPreferences ? { ...defaultPrefs, ...updated.notificationPreferences } : defaultPrefs);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Chyba při ukládání");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !session) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Nastavení</h1>
        <p className="text-gray-600">Načítám…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Nastavení</h1>
        <p className="text-gray-600">Přihlaste se pro správu preferencí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nastavení</h1>
      <p className="text-gray-600">
        Zde můžete zapnout nebo vypnout jednotlivé typy oznámení (e-mail, SMS, push).
      </p>

      <form onSubmit={handleSave} className="card max-w-lg space-y-6 p-4">
        <section>
          <h2 className="mb-3 font-medium text-gray-900">Připomínky rezervací</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-700">1. připomínka e-mailem</span>
              <input
                type="checkbox"
                checked={prefs.emailReminder1}
                onChange={(e) => updatePref("emailReminder1", e.target.checked)}
                className="rounded border-gray-300"
                aria-label="První e-mailová připomínka"
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-700">2. připomínka e-mailem</span>
              <input
                type="checkbox"
                checked={prefs.emailReminder2}
                onChange={(e) => updatePref("emailReminder2", e.target.checked)}
                className="rounded border-gray-300"
                aria-label="Druhá e-mailová připomínka"
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-700">Připomínka SMS</span>
              <input
                type="checkbox"
                checked={prefs.smsReminder}
                onChange={(e) => updatePref("smsReminder", e.target.checked)}
                className="rounded border-gray-300"
                aria-label="SMS připomínka"
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-medium text-gray-900">Marketing a novinky</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-700">E-mail (novinky, akce)</span>
              <input
                type="checkbox"
                checked={prefs.emailMarketing}
                onChange={(e) => updatePref("emailMarketing", e.target.checked)}
                className="rounded border-gray-300"
                aria-label="Marketing e-mailem"
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-700">SMS (novinky, akce)</span>
              <input
                type="checkbox"
                checked={prefs.smsMarketing}
                onChange={(e) => updatePref("smsMarketing", e.target.checked)}
                className="rounded border-gray-300"
                aria-label="Marketing SMS"
              />
            </label>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-medium text-gray-900">Push notifikace</h2>
          <p className="mb-3 text-sm text-gray-600">
            Povolte odběr push zpráv v prohlížeči. Připomínky termínů a novinky/akce (push) zapíná nebo vypíná administrátor u vás v detailu klienta.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {pushStatus === "subscribed" ? (
              <>
                <span className="text-sm text-success-600">Push jsou povoleny</span>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={handleDisablePush}
                  disabled={pushStatus === "loading"}
                >
                  Zrušit push
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={handleEnablePush}
                  disabled={pushStatus === "loading"}
                >
                  {pushStatus === "loading" ? "Načítám…" : "Povolit push notifikace"}
                </button>
                {pushStatus === "error" && pushError && (
                  <span className="text-sm text-error-600" role="alert">
                    {pushError}
                  </span>
                )}
              </>
            )}
          </div>
        </section>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Ukládám…" : "Uložit preference"}
        </button>
      </form>
    </div>
  );
}
