"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import type {
  Settings,
  InvoiceIssuer,
  NotificationEmailSender,
  SmsFaynConfig,
  ReservationNotificationTiming,
  PushNotificationConfig,
  TestEmailBody,
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
  const toast = useToast();
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
  const [testEmail, setTestEmail] = useState<TestEmailBody>({ to: "", subject: "", text: "" });
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; message: string; details?: string } | null>(null);
  const [emailStatusChecking, setEmailStatusChecking] = useState(false);
  const [emailFromEnv, setEmailFromEnv] = useState(false);
  const [testPushSending, setTestPushSending] = useState(false);
  const [testPushMessage, setTestPushMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [testPushUserId, setTestPushUserId] = useState<string>("");

  useEffect(() => {
    api.settings.get().then((s) => {
      setSettings(s);
      setFreeCancelHours(s.freeCancelHours);
      setInvoiceNumberPrefix(s.invoiceNumberPrefix ?? "F");
      setInvoiceNumberNext(s.invoiceNumberNext ?? 1);
      setInvoiceDueDays(s.invoiceDueDays ?? 14);
      setInvoiceIssuer(s.invoiceIssuer ? { ...emptyIssuer, ...s.invoiceIssuer } : emptyIssuer);
      const effective = (s as { effectiveNotificationEmailSender?: { email: string; name?: string; fromEnv: boolean } })
        .effectiveNotificationEmailSender;
      if (effective) {
        setNotificationEmailSender({ email: effective.email, name: effective.name ?? "" });
        setEmailFromEnv(effective.fromEnv);
      } else {
        setNotificationEmailSender(
          s.notificationEmailSender ? { ...emptyEmailSender, ...s.notificationEmailSender } : emptyEmailSender
        );
        setEmailFromEnv(false);
      }
      setSmsFaynConfig(s.smsFaynConfig ? { ...emptySmsFayn, ...s.smsFaynConfig } : emptySmsFayn);
      setReservationTiming(s.reservationNotificationTiming ? { ...emptyTiming, ...s.reservationNotificationTiming } : emptyTiming);
      setPushConfig(s.pushNotificationConfig ? { ...emptyPush, ...s.pushNotificationConfig } : emptyPush);
    });
  }, []);

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    setEmailStatus(null);
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
      const effectiveAfterSave = (s as { effectiveNotificationEmailSender?: { email: string; name?: string; fromEnv: boolean } })
        .effectiveNotificationEmailSender;
      if (effectiveAfterSave) {
        setNotificationEmailSender({ email: effectiveAfterSave.email, name: effectiveAfterSave.name ?? "" });
        setEmailFromEnv(effectiveAfterSave.fromEnv);
      }
      try {
        const status = await api.settings.getEmailStatus();
        setEmailStatus(status);
      } catch (statusErr) {
        setEmailStatus({
          ok: false,
          message: "Kontrola stavu e-mailu selhala",
          details: statusErr instanceof Error ? statusErr.message : "Nepodařilo se ověřit stav.",
        });
      }
      toast("Nastavení bylo uloženo.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    } finally {
      setSaving(false);
    }
  };

  const isServerMode = process.env.NEXT_PUBLIC_API_MODE === "http";

  useEffect(() => {
    if (isServerMode) {
      api.users.list({ role: "CLIENT", limit: 200 }).then((r) => {
        setClients(r.users.map((u) => ({ id: u.id, name: u.name })));
      });
    }
  }, [isServerMode]);

  const handleSendTestPush = async (): Promise<void> => {
    setTestPushMessage(null);
    setTestPushSending(true);
    try {
      const result = await api.push.sendTestPush(
        testPushUserId ? { userId: testPushUserId, title: "Test Přístav radosti", body: "Toto je testovací push." } : undefined
      );
      if (result.sent > 0) {
        setTestPushMessage({ type: "success", text: `Odesláno: ${result.sent} z ${result.total} odběrů.` });
      } else if (result.total === 0) {
        setTestPushMessage({
          type: "error",
          text: "Uživatel nemá push odběry. Klient musí v Nastavení povolit push a uložit.",
        });
      } else {
        setTestPushMessage({ type: "error", text: result.errors?.join(" ") ?? "Odeslání selhalo." });
      }
    } catch (e) {
      setTestPushMessage({ type: "error", text: e instanceof Error ? e.message : "Chyba odeslání push." });
    } finally {
      setTestPushSending(false);
    }
  };

  const handleCheckEmailStatus = async (): Promise<void> => {
    setEmailStatusChecking(true);
    setEmailStatus(null);
    try {
      const status = await api.settings.getEmailStatus();
      setEmailStatus(status);
      const s = await api.settings.get();
      const effective = (s as { effectiveNotificationEmailSender?: { email: string; name?: string; fromEnv: boolean } })
        .effectiveNotificationEmailSender;
      if (effective) {
        setNotificationEmailSender((prev) => ({ ...prev, email: effective.email, name: effective.name ?? prev.name ?? "" }));
        setEmailFromEnv(effective.fromEnv);
      }
    } catch (err) {
      setEmailStatus({
        ok: false,
        message: "Kontrola stavu e-mailu selhala",
        details: err instanceof Error ? err.message : "Nepodařilo se ověřit stav.",
      });
    } finally {
      setEmailStatusChecking(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!testEmail.to || !testEmail.subject.trim()) {
      setTestEmailMessage({ type: "error", text: "Vyplňte e-mail adresáta a předmět." });
      return;
    }
    setTestEmailMessage(null);
    setTestEmailSending(true);
    try {
      const result = await api.settings.sendTestEmail({
        to: testEmail.to.trim(),
        subject: testEmail.subject.trim(),
        text: testEmail.text.trim() || "(prázdná zpráva)",
      });
      setTestEmailMessage({
        type: "success",
        text: result ? `Testovací e-mail byl odeslán na ${result.to}. Zkontrolujte i složku Spam.` : "Testovací e-mail byl odeslán.",
      });
    } catch (err) {
      setTestEmailMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Odeslání selhalo.",
      });
    } finally {
      setTestEmailSending(false);
    }
  };

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
            Odesílatel se načítá ze serveru: pokud je v prostředí nastaven <strong>SMTP_USER</strong>, použije se ten (stačí změnit env a restart API – bez úprav zde). Jinak se bere e-mail vyplněný níže. Jméno odesílatele můžete doplnit vždy. SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS – viz .env.example.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="block text-sm font-medium text-gray-700">E-mail (volitelné, když je SMTP_USER na serveru)</span>
              <input
                type="email"
                className="input mt-1 w-full"
                value={notificationEmailSender.email}
                onChange={(e) =>
                  setNotificationEmailSender((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="notifikace@example.cz"
              />
              {emailFromEnv && (
                <p className="mt-1 text-xs text-gray-500">E-mail se načítá z SMTP_USER v prostředí serveru.</p>
              )}
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
          <button
            type="button"
            onClick={handleCheckEmailStatus}
            disabled={emailStatusChecking}
            className="btn-secondary text-sm"
          >
            {emailStatusChecking ? "Kontroluji…" : "Zkontrolovat stav e-mailu"}
          </button>
        </section>

        <section className="card max-w-lg space-y-4 p-4">
          <h2 className="font-medium text-gray-900">Testovací e-mail</h2>
          <p className="text-sm text-gray-600">
            Odešle jeden e-mail z nastaveného odesílatele na zadanou adresu. Slouží k ověření SMTP a zobrazení jména/adresy odesílatele. V režimu mock se e-mail neodesílá; použijte režim http a nastavte SMTP na backendu.
          </p>
          <div
            className="space-y-3"
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          >
            <label>
              <span className="block text-sm font-medium text-gray-700">Adresát</span>
              <input
                type="email"
                className="input mt-1 w-full"
                value={testEmail.to}
                onChange={(e) => setTestEmail((p) => ({ ...p, to: e.target.value }))}
                placeholder="vas@email.cz"
                required
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700">Předmět</span>
              <input
                type="text"
                className="input mt-1 w-full"
                value={testEmail.subject}
                onChange={(e) => setTestEmail((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Test Přístav radosti"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700">Zpráva</span>
              <textarea
                className="input mt-1 w-full min-h-[100px] resize-y"
                value={testEmail.text}
                onChange={(e) => setTestEmail((p) => ({ ...p, text: e.target.value }))}
                placeholder="Toto je testovací e-mail…"
                rows={4}
              />
            </label>
            {testEmailMessage && (
              <p
                className={`text-sm ${testEmailMessage.type === "success" ? "text-success-600" : "text-error-600"}`}
                role="alert"
              >
                {testEmailMessage.text}
              </p>
            )}
            <button
              type="button"
              className="btn-primary"
              disabled={testEmailSending || (!notificationEmailSender.email && !isServerMode)}
              onClick={(e) => {
                e.preventDefault();
                if (!testEmail.to || !testEmail.subject.trim()) {
                  setTestEmailMessage({ type: "error", text: "Vyplňte e-mail adresáta a předmět." });
                  return;
                }
                handleSendTestEmail(e);
              }}
            >
              {testEmailSending ? "Odesílám…" : "Odeslat testovací e-mail"}
            </button>
            {!notificationEmailSender.email && !isServerMode && (
              <p className="text-sm text-gray-500">Nejprve vyplňte e-mail odesílatele výše a uložte nastavení.</p>
            )}
            {isServerMode && !notificationEmailSender.email && (
              <p className="text-sm text-gray-500">Odesílatel se bere z SMTP_USER na serveru. Změna env se projeví po restartu API.</p>
            )}
            <p className="text-sm text-gray-500">
              Nepřišel e-mail? Zkontrolujte složku <strong>Spam</strong>, správnost adresy adresáta a v logách serveru (Render) hledejte „Test email sent to …“ – pokud tam je, server e-mail předal SMTP.
            </p>
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
            Na serveru nastavte VAPID_PUBLIC_KEY a VAPID_PRIVATE_KEY (npx web-push generate-vapid-keys). Veřejný klíč můžete přepsat níže.
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pushConfig.enabled}
              onChange={(e) => setPushConfig((p) => ({ ...p, enabled: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Push zapnuty</span>
          </label>
          <label>
            <span className="block text-sm text-gray-600">VAPID veřejný klíč (volitelné, jinak z env)</span>
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
            <p className="text-xs text-gray-500">Hlavní obrázek v notifikaci (např. logo aplikace).</p>
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
            <p className="text-xs text-gray-500">Malá ikona u notifikace nebo u ikony aplikace (např. počet nepřečtených).</p>
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
          {isServerMode && (
            <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700">Testovací push</p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Odeslat klientovi</span>
                  <select
                    className="input max-w-xs text-sm"
                    value={testPushUserId}
                    onChange={(e) => setTestPushUserId(e.target.value)}
                    aria-label="Vybrat klienta pro test push"
                  >
                    <option value="">— přihlášený admin —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  disabled={testPushSending}
                  onClick={handleSendTestPush}
                >
                  {testPushSending ? "Odesílám…" : "Odeslat testovací push"}
                </button>
              </div>
              {testPushMessage && (
                <p
                  className={`text-sm ${testPushMessage.type === "success" ? "text-success-600" : "text-error-600"}`}
                  role="alert"
                >
                  {testPushMessage.text}
                </p>
              )}
            </div>
          )}
        </section>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Ukládám…" : "Uložit vše"}
        </button>

        {emailStatus && (
          <div
            className={`mt-4 rounded-lg border p-4 ${
              emailStatus.ok
                ? "border-success-500 bg-success-50 text-success-800"
                : "border-error-500 bg-error-50 text-error-800"
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="font-medium">{emailStatus.ok ? "✓ E-mail online" : "✗ E-mail offline"}</p>
            <p className="mt-1 text-sm">{emailStatus.message}</p>
            {emailStatus.details && <p className="mt-2 text-sm opacity-90">{emailStatus.details}</p>}
          </div>
        )}
      </form>
    </div>
  );
}
