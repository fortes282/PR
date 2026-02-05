"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type {
  Settings,
  InvoiceIssuer,
  NotificationEmailSender,
  SmsFaynConfig,
  ReservationNotificationTiming,
  PushNotificationConfig,
} from "@/lib/contracts/settings";

const emptyIssuer: InvoiceIssuer = {
  name: "",
  street: "",
  city: "",
  zip: "",
  country: "CZ",
  ico: "",
  dic: "",
};

const emptyEmailSender: NotificationEmailSender = { email: "", name: "" };
const emptySmsFayn: SmsFaynConfig = { enabled: false, baseUrl: "https://smsapi.fayn.cz/mex/", username: "" };
const emptyTiming: ReservationNotificationTiming = {
  firstEmailHoursBefore: 48,
  secondEmailHoursBefore: 24,
  smsHoursBefore: undefined,
};
const emptyPush: PushNotificationConfig = {
  enabled: false,
  vapidPublicKey: "",
  defaultTtlSeconds: 86400,
  requireInteraction: false,
  badge: "",
  icon: "",
  promptClientToEnablePush: true,
};

export default function AdminSettingsPage(): React.ReactElement {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [freeCancelHours, setFreeCancelHours] = useState(48);
  const [invoiceNumberPrefix, setInvoiceNumberPrefix] = useState("F");
  const [invoiceNumberNext, setInvoiceNumberNext] = useState(1);
  const [invoiceDueDays, setInvoiceDueDays] = useState(14);
  const [invoiceIssuer, setInvoiceIssuer] = useState<InvoiceIssuer>(emptyIssuer);
  const [notificationEmailSender, setNotificationEmailSender] = useState<NotificationEmailSender>(emptyEmailSender);
  const [smsFaynConfig, setSmsFaynConfig] = useState<SmsFaynConfig>(emptySmsFayn);
  const [reservationTiming, setReservationTiming] = useState<ReservationNotificationTiming>(emptyTiming);
  const [pushConfig, setPushConfig] = useState<PushNotificationConfig>(emptyPush);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings.get().then((s) => {
      setSettings(s);
      setFreeCancelHours(s.freeCancelHours);
      setInvoiceNumberPrefix(s.invoiceNumberPrefix ?? "F");
      setInvoiceNumberNext(s.invoiceNumberNext ?? 1);
      setInvoiceDueDays(s.invoiceDueDays ?? 14);
      setInvoiceIssuer(s.invoiceIssuer ? { ...emptyIssuer, ...s.invoiceIssuer } : emptyIssuer);
      setNotificationEmailSender(
        s.notificationEmailSender ? { ...emptyEmailSender, ...s.notificationEmailSender } : emptyEmailSender
      );
      setSmsFaynConfig(s.smsFaynConfig ? { ...emptySmsFayn, ...s.smsFaynConfig } : emptySmsFayn);
      setReservationTiming(s.reservationNotificationTiming ? { ...emptyTiming, ...s.reservationNotificationTiming } : emptyTiming);
      setPushConfig(s.pushNotificationConfig ? { ...emptyPush, ...s.pushNotificationConfig } : emptyPush);
    });
  }, []);

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.settings.update({
        freeCancelHours,
        invoiceNumberPrefix: invoiceNumberPrefix || undefined,
        invoiceNumberNext,
        invoiceDueDays,
        invoiceIssuer:
          invoiceIssuer.name || invoiceIssuer.street || invoiceIssuer.city || invoiceIssuer.zip
            ? invoiceIssuer
            : undefined,
        notificationEmailSender:
          notificationEmailSender.email ? notificationEmailSender : undefined,
        smsFaynConfig: smsFaynConfig.enabled || smsFaynConfig.username ? smsFaynConfig : undefined,
        reservationNotificationTiming: reservationTiming,
        pushNotificationConfig:
          pushConfig.enabled || pushConfig.vapidPublicKey || pushConfig.promptClientToEnablePush !== undefined
            ? {
                ...pushConfig,
                vapidPublicKey: pushConfig.vapidPublicKey || undefined,
                defaultTtlSeconds: pushConfig.defaultTtlSeconds || undefined,
                badge: pushConfig.badge || undefined,
                icon: pushConfig.icon || undefined,
                promptClientToEnablePush: pushConfig.promptClientToEnablePush,
              }
            : undefined,
      });
      const s = await api.settings.get();
      setSettings(s);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Chyba");
    } finally {
      setSaving(false);
    }
  };

  const isServerMode = process.env.NEXT_PUBLIC_API_MODE === "http";

  if (!settings) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Nastavení</h1>

      <div
        className={`rounded-lg border p-4 text-sm ${isServerMode ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
        role="status"
      >
        {isServerMode ? (
          <>
            <strong>Režim server.</strong> Nastavení se ukládá do databáze na backendu a přežije restart aplikace i obnovení stránky.
          </>
        ) : (
          <>
            <strong>Režim mock (paměť prohlížeče).</strong> Po obnovení stránky (F5) se nastavení vrátí na výchozí. Pro trvalé ukládání nastavte v .env <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_API_MODE=http</code>, <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_API_BASE_URL=http://localhost:3001</code> a spusťte backend (<code className="rounded bg-amber-100 px-1">pnpm dev:api</code>). Po změně env restartujte Next.js.
          </>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="card max-w-md space-y-4 p-4">
          <h2 className="font-medium text-gray-900">Obecné</h2>
          <p className="text-sm text-gray-600">
            Lhůta bezplatného zrušení (hodin). Dostupnost rezervací řídí aktivace pracovní doby v sekci Recepce.
          </p>
          <label>
            <span className="block text-sm font-medium text-gray-700">Bezplatné zrušení (hodin)</span>
            <input
              type="number"
              min={0}
              className="input mt-1 w-24"
              value={freeCancelHours}
              onChange={(e) => setFreeCancelHours(parseInt(e.target.value, 10))}
            />
          </label>
        </section>

        <section className="card max-w-lg space-y-4 p-4">
          <h2 className="font-medium text-gray-900">Fakturace</h2>
          <p className="text-sm text-gray-600">
            Číslování faktur a výchozí splatnost. Hlavička (vystavovatel) se zobrazí na fakturách.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span className="block text-sm font-medium text-gray-700">Prefix čísla</span>
              <input
                type="text"
                className="input mt-1 w-full"
                value={invoiceNumberPrefix}
                onChange={(e) => setInvoiceNumberPrefix(e.target.value)}
                placeholder="F"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700">Další číslo</span>
              <input
                type="number"
                min={1}
                className="input mt-1 w-full"
                value={invoiceNumberNext}
                onChange={(e) => setInvoiceNumberNext(parseInt(e.target.value, 10) || 1)}
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700">Splatnost (dní)</span>
              <input
                type="number"
                min={1}
                className="input mt-1 w-full"
                value={invoiceDueDays}
                onChange={(e) => setInvoiceDueDays(parseInt(e.target.value, 10) || 14)}
              />
            </label>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Vystavovatel (hlavička faktury)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="block text-sm text-gray-600">Název</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.name}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, name: e.target.value }))}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="block text-sm text-gray-600">Ulice, č.p.</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.street}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, street: e.target.value }))}
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600">Město</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.city}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, city: e.target.value }))}
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600">PSČ</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.zip}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, zip: e.target.value }))}
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600">Země</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.country}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, country: e.target.value }))}
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600">IČO</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.ico ?? ""}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, ico: e.target.value || undefined }))}
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600">DIČ</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.dic ?? ""}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, dic: e.target.value || undefined }))}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="card max-w-lg space-y-4 p-4">
          <h2 className="font-medium text-gray-900">Oznámení – odesílatel e-mailů</h2>
          <p className="text-sm text-gray-600">
            E-mailová adresa a jméno, ze kterého se odesílají všechny notifikační e-maily.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="block text-sm font-medium text-gray-700">E-mail</span>
              <input
                type="email"
                className="input mt-1 w-full"
                value={notificationEmailSender.email}
                onChange={(e) =>
                  setNotificationEmailSender((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="notifikace@example.cz"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700">Jméno odesílatele</span>
              <input
                type="text"
                className="input mt-1 w-full"
                value={notificationEmailSender.name ?? ""}
                onChange={(e) =>
                  setNotificationEmailSender((p) => ({ ...p, name: e.target.value || undefined }))
                }
                placeholder="Přístav radosti"
              />
            </label>
          </div>
        </section>

        <section className="card max-w-lg space-y-4 p-4">
          <h2 className="font-medium text-gray-900">SMS – FAYN brána</h2>
          <p className="text-sm text-gray-600">
            Integrace s FAYN SMS API (
            <a
              href="https://smsapi.fayn.cz/mex/api-docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              dokumentace
            </a>
            ). Přihlášení uživatelským jménem a heslem; heslo se na backendu ukládá šifrovaně.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={smsFaynConfig.enabled}
              onChange={(e) =>
                setSmsFaynConfig((p) => ({ ...p, enabled: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">SMS brána zapnuta</span>
          </label>
          <label>
            <span className="block text-sm text-gray-600">URL API</span>
            <input
              type="url"
              className="input mt-1 w-full"
              value={smsFaynConfig.baseUrl ?? ""}
              onChange={(e) =>
                setSmsFaynConfig((p) => ({ ...p, baseUrl: e.target.value || "https://smsapi.fayn.cz/mex/" }))
              }
            />
          </label>
          <label>
            <span className="block text-sm text-gray-600">Uživatelské jméno (FAYN)</span>
            <input
              type="text"
              className="input mt-1 w-full"
              value={smsFaynConfig.username ?? ""}
              onChange={(e) =>
                setSmsFaynConfig((p) => ({ ...p, username: e.target.value || undefined }))
              }
              placeholder="jan.novak"
            />
          </label>
          {smsFaynConfig.passwordSet && (
            <p className="text-sm text-gray-500">Heslo je nastaveno na serveru.</p>
          )}
        </section>

        <section className="card max-w-lg space-y-4 p-4">
          <h2 className="font-medium text-gray-900">Rezervace – načasování připomínek</h2>
          <p className="text-sm text-gray-600">
            Kdy posílat 1. a 2. e-mail a volitelně SMS vzhledem k začátku termínu (hodiny předem).
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className="block text-sm font-medium text-gray-700">1. e-mail (hodin předem)</span>
              <input
                type="number"
                min={0}
                className="input mt-1 w-full"
                value={reservationTiming.firstEmailHoursBefore ?? ""}
                onChange={(e) =>
                  setReservationTiming((p) => ({
                    ...p,
                    firstEmailHoursBefore: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
                placeholder="48"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700">2. e-mail (hodin předem)</span>
              <input
                type="number"
                min={0}
                className="input mt-1 w-full"
                value={reservationTiming.secondEmailHoursBefore ?? ""}
                onChange={(e) =>
                  setReservationTiming((p) => ({
                    ...p,
                    secondEmailHoursBefore: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
                placeholder="24"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700">SMS (hodin předem, 0 = vypnuto)</span>
              <input
                type="number"
                min={0}
                className="input mt-1 w-full"
                value={reservationTiming.smsHoursBefore ?? ""}
                onChange={(e) =>
                  setReservationTiming((p) => ({
                    ...p,
                    smsHoursBefore: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
                placeholder="0"
              />
            </label>
          </div>
        </section>

        <section className="card max-w-lg space-y-4 p-4">
          <h2 className="font-medium text-gray-900">Push notifikace</h2>
          <p className="text-sm text-gray-600">
            Web Push (VAPID). Veřejný klíč pro odběr na klientech; soukromý klíč pouze na serveru.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pushConfig.enabled}
              onChange={(e) => setPushConfig((p) => ({ ...p, enabled: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Push notifikace zapnuty</span>
          </label>
          <label>
            <span className="block text-sm text-gray-600">VAPID veřejný klíč (base64url)</span>
            <input
              type="text"
              className="input mt-1 w-full font-mono text-sm"
              value={pushConfig.vapidPublicKey ?? ""}
              onChange={(e) =>
                setPushConfig((p) => ({ ...p, vapidPublicKey: e.target.value || undefined }))
              }
              placeholder="BN…"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="block text-sm text-gray-600">TTL (s)</span>
              <input
                type="number"
                min={0}
                className="input mt-1 w-full"
                value={pushConfig.defaultTtlSeconds ?? ""}
                onChange={(e) =>
                  setPushConfig((p) => ({
                    ...p,
                    defaultTtlSeconds: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
                placeholder="86400"
              />
            </label>
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={pushConfig.requireInteraction ?? false}
                onChange={(e) =>
                  setPushConfig((p) => ({ ...p, requireInteraction: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Vyžadovat kliknutí</span>
            </label>
          </div>
          <label>
            <span className="block text-sm text-gray-600">Ikona (URL)</span>
            <input
              type="url"
              className="input mt-1 w-full"
              value={pushConfig.icon ?? ""}
              onChange={(e) => setPushConfig((p) => ({ ...p, icon: e.target.value || undefined }))}
              placeholder="https://…"
            />
          </label>
          <label>
            <span className="block text-sm text-gray-600">Badge (URL)</span>
            <input
              type="url"
              className="input mt-1 w-full"
              value={pushConfig.badge ?? ""}
              onChange={(e) => setPushConfig((p) => ({ ...p, badge: e.target.value || undefined }))}
              placeholder="https://…"
            />
          </label>
          <label className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={pushConfig.promptClientToEnablePush ?? true}
              onChange={(e) =>
                setPushConfig((p) => ({ ...p, promptClientToEnablePush: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Zobrazovat klientům výzvu k zapnutí push (po prvním spuštění a při každém dalším otevření aplikace)
            </span>
          </label>
        </section>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Ukládám…" : "Uložit vše"}
        </button>
      </form>
    </div>
  );
}
