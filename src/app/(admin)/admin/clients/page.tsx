"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Receipt } from "lucide-react";
import { api, type ClientBehaviorScore } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import { DataTable } from "@/components/tables/DataTable";
import { Modal } from "@/components/modals/Modal";
import type { User } from "@/lib/contracts/users";

export default function AdminClientsPage(): React.ReactElement {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [scoresByClient, setScoresByClient] = useState<Map<string, ClientBehaviorScore>>(new Map());
  const [unpaidClientIds, setUnpaidClientIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<"email" | "sms" | null>(null);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.users.list({ role: "CLIENT", search: search || undefined }).then((r) => {
      setUsers(r.users);
      const ids = r.users.map((u) => u.id);
      api.behavior.getClientScores(ids).then((scores) => {
        const map = new Map<string, ClientBehaviorScore>();
        scores.forEach((s) => map.set(s.clientId, s));
        setScoresByClient(map);
      });
      api.invoices.list().then((invoices) => {
        const unpaid = new Set(
          invoices.filter((i) => i.status !== "PAID").map((i) => i.clientId)
        );
        setUnpaidClientIds(unpaid);
      });
    }).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleOne = (id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (): void => {
    if (selectedIds.size === users.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(users.map((u) => u.id)));
  };

  const openBulkEmail = (): void => {
    setBulkSubject("");
    setBulkMessage("");
    setBulkModal("email");
  };

  const openBulkSms = (): void => {
    setBulkMessage("");
    setBulkModal("sms");
  };

  const sendBulk = async (): Promise<void> => {
    if (selectedIds.size === 0 || !bulkModal) return;
    const channel = bulkModal === "email" ? "EMAIL" : "SMS";
    if (!bulkMessage.trim()) {
      toast("Zadejte text zprávy.", "error");
      return;
    }
    if (channel === "EMAIL" && !bulkSubject.trim()) {
      toast("Zadejte předmět e-mailu.", "error");
      return;
    }
    setSending(true);
    try {
      const res = await api.notifications.sendBulk({
        clientIds: Array.from(selectedIds),
        channel,
        subject: channel === "EMAIL" ? bulkSubject : undefined,
        message: bulkMessage.trim(),
        title: channel === "EMAIL" ? bulkSubject : undefined,
      });
      const label = channel === "EMAIL" ? "e-mailů" : "SMS";
      let msg = `Odesláno: ${res.sent} ${label}.`;
      if (res.sent === 0 || (res.skippedNoPhone ?? 0) > 0 || (res.errors?.length ?? 0) > 0) {
        const parts: string[] = [];
        if ((res.skippedNoPhone ?? 0) > 0) parts.push(`${res.skippedNoPhone} klientů nemá vyplněný telefon`);
        if ((res.errors?.length ?? 0) > 0) parts.push(...(res.errors ?? []));
        if (parts.length > 0) msg += " Důvod: " + parts.join(". ");
      }
      toast(msg, res.sent > 0 ? "success" : "error");
      setBulkModal(null);
      setSelectedIds(new Set());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba při odesílání", "error");
    } finally {
      setSending(false);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Klienti (admin)</h1>
      <p className="text-sm text-gray-600">
        Stejná správa klientů jako na recepci: vyhledávání, hromadný e-mail/SMS, detail včetně logu a resetu hesla.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="search"
          placeholder="Hledat jméno / e-mail"
          className="input max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {selectedCount > 0 && (
          <>
            <span className="text-sm text-gray-600">Vybráno: {selectedCount}</span>
            <button type="button" className="btn-primary" onClick={openBulkEmail} aria-label="Odeslat e-mail vybraným">
              Odeslat e-mail vybraným
            </button>
            <button type="button" className="btn-secondary" onClick={openBulkSms} aria-label="Odeslat SMS vybraným">
              Odeslat SMS vybraným
            </button>
          </>
        )}
      </div>
      <DataTable<User>
        columns={[
          {
            key: "select",
            header: (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={users.length > 0 && selectedIds.size === users.length}
                  onChange={toggleAll}
                  aria-label="Vybrat všechny"
                  className="rounded border-gray-300"
                />
                <span>Vybrat</span>
              </label>
            ),
            render: (r) => (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleOne(r.id)}
                  aria-label={`Vybrat ${r.name}`}
                  className="rounded border-gray-300"
                />
              </label>
            ),
          },
          {
            key: "name",
            header: "Jméno",
            render: (r) => {
              const score = scoresByClient.get(r.id);
              const hasUnpaid = unpaidClientIds.has(r.id);
              const scoreTitle = score
                ? `Chování: Spolehlivost ${score.reliabilityScore}, Riziko zrušení ${score.cancellationRiskScore}, Reaktivita ${score.reactivityScore}, Doplnění ${score.fillHelperScore}`
                : "";
              return (
                <span className="flex items-center gap-1.5">
                  <span>{r.name}</span>
                  {score != null && (
                    <span
                      className="inline-flex shrink-0 text-gray-400"
                      title={scoreTitle}
                      aria-label={scoreTitle}
                    >
                      <BarChart3 className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                  {hasUnpaid && (
                    <span
                      className="inline-flex shrink-0 text-amber-600"
                      title="Nezaplacené faktury"
                      aria-label="Nezaplacené faktury"
                    >
                      <Receipt className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                </span>
              );
            },
          },
          { key: "email", header: "E-mail" },
          {
            key: "id",
            header: "Akce",
            render: (r) => (
              <Link href={`/admin/clients/${r.id}`} className="text-primary-600 hover:underline">
                Detail
              </Link>
            ),
          },
        ]}
        data={users}
        keyExtractor={(r) => r.id}
      />

      {bulkModal && (
        <Modal open={true} onClose={() => !sending && setBulkModal(null)} title={bulkModal === "email" ? "Hromadný e-mail" : "Hromadná SMS"}>
          <div className="space-y-4">
            {bulkModal === "email" && (
              <label>
                <span className="block text-sm font-medium text-gray-700">Předmět</span>
                <input type="text" className="input mt-1 w-full" value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} placeholder="Předmět e-mailu" />
              </label>
            )}
            <label>
              <span className="block text-sm font-medium text-gray-700">{bulkModal === "email" ? "Text e-mailu" : "Text SMS"}</span>
              <textarea className="input mt-1 w-full min-h-[120px]" value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} placeholder={bulkModal === "sms" ? "Max. 160 znaků…" : "Zpráva"} maxLength={bulkModal === "sms" ? 160 : undefined} />
              {bulkModal === "sms" && <p className="mt-1 text-xs text-gray-500">{bulkMessage.length}/160</p>}
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setBulkModal(null)} disabled={sending}>Zrušit</button>
              <button type="button" className="btn-primary" onClick={sendBulk} disabled={sending || !bulkMessage.trim() || (bulkModal === "email" && !bulkSubject.trim())}>{sending ? "Odesílám…" : "Odeslat"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
