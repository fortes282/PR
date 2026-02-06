"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatCzk } from "@/lib/utils/money";
import { format } from "@/lib/utils/date";
import type { User, NotificationPreferences } from "@/lib/contracts/users";
import type { ClientProfileLogEntry } from "@/lib/contracts";
import type { MedicalReport } from "@/lib/contracts";

export default function AdminClientDetailPage(): React.ReactElement {
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<Awaited<ReturnType<typeof api.credits.get>> | null>(null);
  const [transactions, setTransactions] = useState<Awaited<ReturnType<typeof api.credits.getTransactions>>>([]);
  const [appointments, setAppointments] = useState<Awaited<ReturnType<typeof api.appointments.list>>>([]);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileLog, setProfileLog] = useState<ClientProfileLogEntry[]>([]);
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [edit, setEdit] = useState({
    firstName: "",
    lastName: "",
    childName: "",
    phone: "",
    street: "",
    city: "",
    zip: "",
    country: "CZ",
  });
  const [pushPrefs, setPushPrefs] = useState({ pushAppointmentReminder: true, pushMarketing: false });
  const [savingPush, setSavingPush] = useState(false);

  const loadLog = useCallback(() => {
    api.clientProfileLog.list({ clientId: id }).then(setProfileLog);
  }, [id]);

  useEffect(() => {
    api.users.get(id).then((u) => {
      if (u) {
        setUser(u);
        setEdit({
          firstName: u.firstName ?? u.name.split(" ")[0] ?? "",
          lastName: u.lastName ?? u.name.split(" ").slice(1).join(" ") ?? "",
          childName: u.childName ?? "",
          phone: u.phone ?? "",
          street: u.billingAddress?.street ?? "",
          city: u.billingAddress?.city ?? "",
          zip: u.billingAddress?.zip ?? "",
          country: u.billingAddress?.country ?? "CZ",
        });
        const np = u.notificationPreferences;
        setPushPrefs({
          pushAppointmentReminder: np?.pushAppointmentReminder ?? true,
          pushMarketing: np?.pushMarketing ?? false,
        });
      }
    });
    api.credits.get(id).then(setCredits);
    api.credits.getTransactions(id).then(setTransactions);
    api.appointments.list({ clientId: id }).then(setAppointments);
    api.medicalReports.list(id).then(setMedicalReports);
    loadLog();
  }, [id, loadLog]);

  const handleAdjust = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || !adjustReason) return;
    try {
      await api.credits.adjust(id, { amountCzk: amount, reason: adjustReason });
      const [acc, txs] = await Promise.all([api.credits.get(id), api.credits.getTransactions(id)]);
      setCredits(acc);
      setTransactions(txs);
      setAdjustAmount("");
      setAdjustReason("");
      loadLog();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chyba");
    }
  };

  const handleSaveClient = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updated = await api.users.update(id, {
        firstName: edit.firstName || undefined,
        lastName: edit.lastName || undefined,
        childName: edit.childName || undefined,
        phone: edit.phone || undefined,
        billingAddress:
          edit.street || edit.city || edit.zip
            ? { street: edit.street, city: edit.city, zip: edit.zip, country: edit.country }
            : undefined,
      });
      setUser(updated);
      loadLog();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePushPrefs = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!user) return;
    setSavingPush(true);
    try {
      const existing = user.notificationPreferences;
      const notificationPreferences: NotificationPreferences = {
        emailReminder1: existing?.emailReminder1 ?? true,
        emailReminder2: existing?.emailReminder2 ?? true,
        smsReminder: existing?.smsReminder ?? false,
        emailMarketing: existing?.emailMarketing ?? false,
        smsMarketing: existing?.smsMarketing ?? false,
        pushAppointmentReminder: pushPrefs.pushAppointmentReminder,
        pushMarketing: pushPrefs.pushMarketing,
      };
      const updated = await api.users.update(id, { notificationPreferences });
      setUser(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSavingPush(false);
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    if (!confirm("Odeslat klientovi e-mail s odkazem na nastavení nového hesla?")) return;
    setResettingPassword(true);
    try {
      await api.admin.resetClientPassword({ clientId: id });
      loadLog();
      alert("E-mail s odkazem na nastavení hesla byl odeslán (v mocku vytvořena notifikace).");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chyba");
    } finally {
      setResettingPassword(false);
    }
  };

  if (!user) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <Link href="/admin/clients" className="text-sm text-primary-600 hover:underline">
        ← Klienti
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleResetPassword}
          disabled={resettingPassword}
          title="Odeslat klientovi e-mail s odkazem na nastavení nového hesla"
        >
          {resettingPassword ? "Odesílám…" : "Resetovat heslo a poslat e-mail"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={`/admin/clients/${id}/health-record`} className="text-primary-600 hover:underline">
          Zdravotní záznam
        </Link>
        <span className="text-gray-400">|</span>
        <Link href="#reports" className="text-primary-600 hover:underline">
          Lékařské zprávy
        </Link>
      </div>
      <div className="card max-w-lg space-y-2 p-4">
        <p><strong>E-mail:</strong> {user.email}</p>
        <p><strong>Kredity:</strong> {credits ? formatCzk(credits.balanceCzk) : "—"}</p>
      </div>

      <section>
        <h2 className="font-medium text-gray-700">Push notifikace (nastavuje pouze admin)</h2>
        <p className="text-sm text-gray-600">
          Klient nemůže tyto položky měnit ve svém nastavení; zapíná nebo vypíná je pouze administrátor zde.
        </p>
        <form onSubmit={handleSavePushPrefs} className="card mt-2 max-w-lg space-y-3 p-4">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700">Připomínky termínů (push)</span>
            <input
              type="checkbox"
              checked={pushPrefs.pushAppointmentReminder}
              onChange={(e) =>
                setPushPrefs((p) => ({ ...p, pushAppointmentReminder: e.target.checked }))
              }
              className="rounded border-gray-300"
              aria-label="Připomínky termínů push"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700">Novinky a akce (push)</span>
            <input
              type="checkbox"
              checked={pushPrefs.pushMarketing}
              onChange={(e) =>
                setPushPrefs((p) => ({ ...p, pushMarketing: e.target.checked }))
              }
              className="rounded border-gray-300"
              aria-label="Novinky a akce push"
            />
          </label>
          <button type="submit" className="btn-primary" disabled={savingPush}>
            {savingPush ? "Ukládám…" : "Uložit push preference"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Údaje pro fakturaci (jméno, adresa, telefon)</h2>
        <form onSubmit={handleSaveClient} className="card mt-2 max-w-lg space-y-3 p-4">
          <label className="block">
            <span className="text-sm text-gray-600">Jméno</span>
            <input type="text" className="input mt-1" value={edit.firstName} onChange={(e) => setEdit((p) => ({ ...p, firstName: e.target.value }))} placeholder="Křestní jméno" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Příjmení</span>
            <input type="text" className="input mt-1" value={edit.lastName} onChange={(e) => setEdit((p) => ({ ...p, lastName: e.target.value }))} placeholder="Příjmení" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Jméno dítěte (volitelné)</span>
            <input type="text" className="input mt-1" value={edit.childName} onChange={(e) => setEdit((p) => ({ ...p, childName: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Telefon</span>
            <input type="text" className="input mt-1" value={edit.phone} onChange={(e) => setEdit((p) => ({ ...p, phone: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Ulice a číslo</span>
            <input type="text" className="input mt-1" value={edit.street} onChange={(e) => setEdit((p) => ({ ...p, street: e.target.value }))} />
          </label>
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="text-sm text-gray-600">Město</span>
              <input type="text" className="input mt-1 w-full" value={edit.city} onChange={(e) => setEdit((p) => ({ ...p, city: e.target.value }))} />
            </label>
            <label className="w-24">
              <span className="text-sm text-gray-600">PSČ</span>
              <input type="text" className="input mt-1 w-full" value={edit.zip} onChange={(e) => setEdit((p) => ({ ...p, zip: e.target.value }))} />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-gray-600">Země</span>
            <input type="text" className="input mt-1 w-24" value={edit.country} onChange={(e) => setEdit((p) => ({ ...p, country: e.target.value }))} />
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Ukládám…" : "Uložit údaje"}</button>
        </form>
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Upravit kredity</h2>
        <form onSubmit={handleAdjust} className="mt-2 flex flex-wrap items-end gap-2">
          <input type="number" placeholder="Částka (+/-)" className="input w-32" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
          <input type="text" placeholder="Důvod" className="input w-48" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
          <button type="submit" className="btn-primary">Upravit</button>
        </form>
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Historie transakcí</h2>
        <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white text-sm">
          {transactions.map((t) => (
            <li key={t.id} className="flex justify-between px-4 py-2">
              <span>{format(new Date(t.createdAt), "date")} {t.reason}</span>
              <span>{formatCzk(t.amountCzk)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="reports">
        <h2 className="font-medium text-gray-700">Lékařské zprávy</h2>
        <p className="text-sm text-gray-600">Vytvořené lékařské zprávy lze stáhnout v PDF nebo DOCX.</p>
        {medicalReports.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Žádné lékařské zprávy.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-200 rounded border border-gray-200 bg-white text-sm">
            {medicalReports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="text-gray-900">
                  {format(new Date(r.reportDate), "date")} – {r.clientFullName}
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="text-primary-600 hover:underline"
                    onClick={async () => {
                      try {
                        const blob = await api.medicalReports.exportPdf(r.id);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `zprava-${r.reportDate}-${r.id}.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "Stažení selhalo");
                      }
                    }}
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    className="text-primary-600 hover:underline"
                    onClick={async () => {
                      try {
                        const blob = await api.medicalReports.exportDocx(r.id);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `zprava-${r.reportDate}-${r.id}.docx`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "Stažení selhalo");
                      }
                    }}
                  >
                    DOCX
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Rezervace</h2>
        <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white text-sm">
          {appointments.slice(0, 10).map((a) => (
            <li key={a.id} className="flex justify-between px-4 py-2">
              <span>{format(new Date(a.startAt), "datetime")}</span>
              <span>{a.status}</span>
              <Link href={`/reception/appointments/${a.id}`} className="text-primary-600 hover:underline">Detail</Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Profil klienta – log</h2>
        <p className="text-sm text-gray-600">Odeslaná oznámení, změny údajů, úpravy hodnocení, reset hesla. Viditelné pro admin i recepci.</p>
        <ul className="mt-2 max-h-64 overflow-y-auto divide-y divide-gray-200 rounded border border-gray-200 bg-white text-sm">
          {profileLog.length === 0 ? (
            <li className="px-4 py-3 text-gray-500">Žádné záznamy</li>
          ) : (
            profileLog.map((e) => (
              <li key={e.id} className="px-4 py-2">
                <span className="text-gray-500">{format(new Date(e.createdAt), "datetime")}</span>
                <span className="mx-2 font-medium">{e.kind}</span>
                <span>{e.summary}</span>
                {e.detail && <span className="block text-gray-600">{e.detail}</span>}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
