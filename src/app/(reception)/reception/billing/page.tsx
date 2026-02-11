"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import { formatCzk } from "@/lib/utils/money";
import { downloadCsv } from "@/lib/utils/csv";
import { format } from "@/lib/utils/date";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import type { BillingReport } from "@/lib/contracts/billing";
import type { Invoice } from "@/lib/contracts/invoices";
import type { User } from "@/lib/contracts/users";

function hasRequiredInvoiceData(user: User | null): boolean {
  if (!user) return false;
  const first = (user.firstName ?? user.name.split(" ")[0] ?? "").trim();
  const last = (user.lastName ?? user.name.split(" ").slice(1).join(" ") ?? "").trim();
  const addr = user.billingAddress;
  return first.length > 0 && last.length > 0 && !!(addr?.street && addr?.city && addr?.zip);
}

export default function ReceptionBillingPage(): React.ReactElement {
  const toast = useToast();
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState<BillingReport | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    api.users.list({ role: "CLIENT" }).then((r) => {
      setUsers(Object.fromEntries(r.users.map((u) => [u.id, u])));
    });
    api.invoices.list().then(setInvoices);
  }, []);

  const handleGenerateReport = async (): Promise<void> => {
    setGenerating(true);
    try {
      const r = await api.billing.generateMonthly({ year: periodYear, month: periodMonth });
      setReport(r);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCsv = async (): Promise<void> => {
    if (!report) return;
    try {
      const csv = await api.billing.exportCsv(report.id);
      downloadCsv(csv, `billing-${periodYear}-${periodMonth}.csv`);
      toast("Soubor byl stažen.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    }
  };

  const handleMarkInvoiced = async (): Promise<void> => {
    if (!report || report.unpaidAppointments.length === 0) return;
    try {
      await api.billing.markInvoiced(report.unpaidAppointments.map((a) => a.id));
      setReport(null);
      toast("Označeno jako vyfakturováno.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    }
  };

  const handleGenerateInvoice = async (clientId: string): Promise<void> => {
    if (!report) return;
    const user = users[clientId];
    if (!hasRequiredInvoiceData(user ?? null)) {
      toast(
        "Pro vygenerování faktury vyplňte u klienta: jméno, příjmení, ulici, město a PSČ (Klienti → detail klienta → Údaje pro fakturaci).",
        "error"
      );
      return;
    }
    const clientAppIds = report.unpaidAppointments
      .filter((a) => a.clientId === clientId)
      .map((a) => a.id);
    if (clientAppIds.length === 0) return;
    try {
      await api.invoices.create({ clientId, appointmentIds: clientAppIds });
      const list = await api.invoices.list();
      setInvoices(list);
      toast("Faktura byla vytvořena.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    }
  };

  const handleSendInvoice = async (id: string): Promise<void> => {
    setSending(id);
    try {
      await api.invoices.send(id);
      const list = await api.invoices.list();
      setInvoices(list);
      toast("Faktura byla odeslána.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    } finally {
      setSending(null);
    }
  };

  const handleSendBulk = async (): Promise<void> => {
    const toSend = invoices.filter((i) => i.status === "DRAFT" || i.status === "SENT").map((i) => i.id);
    if (toSend.length === 0) {
      toast("Žádné faktury k odeslání.", "info");
      return;
    }
    setSending("bulk");
    try {
      await api.invoices.sendBulk(toSend);
      const list = await api.invoices.list();
      setInvoices(list);
      toast("Faktury byly odeslány.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    } finally {
      setSending(null);
    }
  };

  const handleSendOverdueReminders = async (): Promise<void> => {
    setSendingReminders(true);
    try {
      const { sent } = await api.invoices.sendOverdueReminders();
      toast(sent === 0 ? "Žádné faktury po splatnosti k odeslání upomínek." : `Odesláno ${sent} upomínek.`, sent > 0 ? "success" : "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    } finally {
      setSendingReminders(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (inv: Invoice): boolean =>
    inv.status !== "PAID" && inv.dueDate < today;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fakturace</h1>
      <p className="text-gray-600">
        Měsíční přehled nezaplacených termínů. Generujte faktury podle klientů (ověří se údaje pro fakturaci). Export CSV, označit jako vyfakturováno.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <label>
          <span className="mr-2 text-sm text-gray-700">Rok</span>
          <input
            type="number"
            className="input w-24"
            value={periodYear}
            onChange={(e) => setPeriodYear(parseInt(e.target.value, 10))}
          />
        </label>
        <label>
          <span className="mr-2 text-sm text-gray-700">Měsíc</span>
          <input
            type="number"
            min={1}
            max={12}
            className="input w-20"
            value={periodMonth}
            onChange={(e) => setPeriodMonth(parseInt(e.target.value, 10))}
          />
        </label>
        <button
          type="button"
          className="btn-primary"
          disabled={generating}
          onClick={handleGenerateReport}
        >
          {generating ? "Generuji…" : "Generovat report"}
        </button>
      </div>

      {report && (
        <div className="card space-y-4 p-4">
          <h2 className="font-medium text-gray-700">
            Report {periodYear}-{periodMonth} · Celkem nezaplaceno: {formatCzk(report.totalUnpaidCzk)}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-4 font-medium text-gray-700">Klient</th>
                  <th className="py-2 pr-4 font-medium text-gray-700">Suma</th>
                  <th className="py-2 font-medium text-gray-700">Akce</th>
                </tr>
              </thead>
              <tbody>
                {report.perClientTotals.map((row) => {
                  const user = users[row.clientId];
                  const ok = hasRequiredInvoiceData(user ?? null);
                  const clientAppIds = report.unpaidAppointments
                    .filter((a) => a.clientId === row.clientId)
                    .map((a) => a.id);
                  return (
                    <tr key={row.clientId} className="border-b border-gray-100">
                      <td className="py-2 pr-4">{user?.name ?? row.clientId}</td>
                      <td className="py-2 pr-4">{formatCzk(row.totalCzk)}</td>
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            className="btn-primary text-xs"
                            disabled={clientAppIds.length === 0 || !ok}
                            onClick={() => handleGenerateInvoice(row.clientId)}
                            title={!ok ? "Vyplňte u klienta jméno, příjmení a adresu" : undefined}
                          >
                            {!ok ? "Chybí údaje" : "Generovat fakturu"}
                          </button>
                          <HelpTooltip
                            title="Generovat fakturu"
                            description="Vytvoří fakturu za nezaplacené termíny tohoto klienta v zvoleném období. Číslo a splatnost se berou z nastavení (Admin → Nastavení → Fakturace)."
                            disabledReason={!ok ? "U klienta chybí údaje pro fakturaci: jméno, příjmení, ulice, město, PSČ. Vyplňte je v detailu klienta." : clientAppIds.length === 0 ? "Pro tohoto klienta v tomto období nejsou nezaplacené termíny." : undefined}
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={handleExportCsv}>
              Export CSV
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleMarkInvoiced}
              disabled={report.unpaidAppointments.length === 0}
            >
              Označit jako vyfakturováno
            </button>
          </div>
        </div>
      )}

      <section>
        <h2 className="font-medium text-gray-700">Faktury</h2>
        <p className="text-sm text-gray-600">
          Faktury po splatnosti jsou zvýrazněny červeně. Odeslání jednotlivě nebo hromadně.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={!!sending}
            onClick={() => api.invoices.list().then(setInvoices)}
          >
            Obnovit
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!!sending || invoices.length === 0}
            onClick={handleSendBulk}
          >
            {sending === "bulk" ? "Odesílám…" : "Odeslat hromadně"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={sendingReminders}
            onClick={handleSendOverdueReminders}
            title="Odeslat e-mail upomínky za faktury po splatnosti"
          >
            {sendingReminders ? "Odesílám upomínky…" : "Odeslat upomínky (po splatnosti)"}
          </button>
        </div>
        <ul className="mt-2 divide-y divide-gray-200 rounded border border-gray-200 bg-white text-sm">
          {invoices.length === 0 ? (
            <li className="px-4 py-6 text-center text-gray-500">Žádné faktury</li>
          ) : (
            invoices.map((inv) => (
              <li
                key={inv.id}
                className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${isOverdue(inv) ? "bg-red-50 text-red-900" : ""}`}
              >
                <span className="font-medium">{inv.number}</span>
                <span>{inv.recipient.lastName} {inv.recipient.firstName}</span>
                <span>{formatCzk(inv.amountCzk)}</span>
                <span>splatnost {inv.dueDate}</span>
                <span>{inv.status}</span>
                <div className="flex gap-2">
                  <a href={`/reception/invoices/${inv.id}`} className="btn-ghost text-xs">
                    Upravit
                  </a>
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    disabled={!!sending}
                    onClick={() => handleSendInvoice(inv.id)}
                  >
                    {sending === inv.id ? "Odesílám…" : "Odeslat"}
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="card max-w-2xl space-y-2 p-4">
        <h2 className="font-medium text-gray-700">Párování plateb (FIO banka)</h2>
        <p className="text-sm text-gray-600">
          Propojení s FIO Bank API umožní stáhnout bankovní transakce a ručně nebo automaticky je přiřadit k fakturam.
          Backend: implementovat sync z FIO API a automatické párování podle variabilního symbolu.
        </p>
        <p className="text-sm text-gray-500">
          V mock režimu jsou transakce prázdné. Po implementaci backendu zde bude synchronizace a seznam transakcí k párování.
        </p>
      </section>
    </div>
  );
}
