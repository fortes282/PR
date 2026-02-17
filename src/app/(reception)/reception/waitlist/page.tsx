"use client";

import { useCallback, useEffect, useState } from "react";
import { Lightbulb, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { DataTable } from "@/components/tables/DataTable";
import { Modal } from "@/components/modals/Modal";
import type { WaitingListEntry } from "@/lib/contracts/waitlist";
import type { WaitlistSuggestion } from "@/lib/contracts/waitlist";
import type { User } from "@/lib/contracts/users";
import type { Service } from "@/lib/contracts/services";

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function monthLabel(from?: number, to?: number): string {
  if (from == null && to == null) return "—";
  if (from != null && to != null && from === to) return MONTH_NAMES[from - 1];
  if (from != null && to != null) return `${MONTH_NAMES[from - 1]} – ${MONTH_NAMES[to - 1]}`;
  if (from != null) return `od ${MONTH_NAMES[from - 1]}`;
  if (to != null) return `do ${MONTH_NAMES[to - 1]}`;
  return "—";
}

export default function ReceptionWaitlistPage(): React.ReactElement {
  const toast = useToast();
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [suggestions, setSuggestions] = useState<WaitlistSuggestion[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState<WaitingListEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const slotStart = new Date();
  const slotEnd = new Date(Date.now() + 60 * 60 * 1000);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.waitlist.list().then(setEntries),
      api.waitlist.suggestions({
        slotStart: slotStart.toISOString(),
        slotEnd: slotEnd.toISOString(),
      }).then(setSuggestions),
      api.users.list({ role: "CLIENT" }).then((r) => {
        const map = new Map<string, User>();
        r.users.forEach((u) => map.set(u.id, u));
        setUsers(map);
      }),
      api.services.list().then(setServices),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clientName = (id: string): string => users.get(id)?.name ?? id;
  const serviceName = (id: string): string => services.find((s) => s.id === id)?.name ?? id;

  const handleNotify = async (entryId: string): Promise<void> => {
    try {
      await api.waitlist.notify(entryId);
      toast("Oznámení odesláno.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editEntry) return;
    setSaving(true);
    try {
      await api.waitlist.update(editEntry.id, {
        serviceId: editEntry.serviceId,
        preferredMonthFrom: editEntry.preferredMonthFrom,
        preferredMonthTo: editEntry.preferredMonthTo,
        priority: editEntry.priority,
        notes: editEntry.notes ?? undefined,
      });
      toast("Záznam upraven.", "success");
      setEditEntry(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Chyba", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteId) return;
    try {
      await api.waitlist.delete(deleteId);
      toast("Záznam z čekacího listu odstraněn.", "success");
      setDeleteId(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Chyba", "error");
    }
  };

  if (loading) return <PageSkeleton lines={5} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Čekací list</h1>
      <p className="text-sm text-gray-600">
        Data od klientů (služba, rozmezí měsíců). Můžete záznamy upravovat, mazat nebo poslat nabídku.
      </p>

      <section>
        <h2 className="font-medium text-gray-700">Doporučení pro volný slot</h2>
        <p className="text-sm text-gray-500">
          Slot: {slotStart.toLocaleTimeString("cs-CZ")} – {slotEnd.toLocaleTimeString("cs-CZ")}
        </p>
        <ul className="mt-2 divide-y divide-gray-200 rounded border border-gray-200 bg-white">
          {suggestions.length === 0 ? (
            <li className="list-none">
              <EmptyState
                icon={Lightbulb}
                title="Žádná doporučení"
                description="Pro zvolený slot nejsou žádní klienti na čekacím listu."
                variant="inline"
              />
            </li>
          ) : (
            suggestions.map((s) => (
              <li key={s.entry.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-medium">{clientName(s.entry.clientId)}</span>
                  <span className="ml-2 text-sm text-gray-500">{serviceName(s.entry.serviceId)} · Skóre: {s.score}</span>
                </div>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => handleNotify(s.entry.id)}
                >
                  Poslat nabídku
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Všichni na čekacím listu</h2>
        <DataTable<WaitingListEntry>
          columns={[
            { key: "clientId", header: "Klient", render: (r) => clientName(r.clientId) },
            { key: "serviceId", header: "Služba", render: (r) => serviceName(r.serviceId) },
            {
              key: "months",
              header: "Měsíce",
              render: (r) => monthLabel(r.preferredMonthFrom, r.preferredMonthTo),
            },
            { key: "priority", header: "Priorita", render: (r) => r.priority ?? "—" },
            {
              key: "id",
              header: "Akce",
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => setEditEntry(r)}
                    aria-label={`Upravit ${clientName(r.clientId)}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-sm text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteId(r.id)}
                    aria-label={`Smazat ${clientName(r.clientId)}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    onClick={() => handleNotify(r.id)}
                  >
                    Poslat nabídku
                  </button>
                </div>
              ),
            },
          ]}
          data={entries}
          keyExtractor={(r) => r.id}
        />
      </section>

      {editEntry && (
        <Modal open={true} onClose={() => !saving && setEditEntry(null)} title="Upravit záznam čekacího listu">
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <p className="text-sm text-gray-600">Klient: {clientName(editEntry.clientId)}</p>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Služba</span>
              <select
                className="input mt-1 w-full"
                value={editEntry.serviceId}
                onChange={(e) => setEditEntry((prev) => prev ? { ...prev, serviceId: e.target.value } : null)}
                aria-label="Služba"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <div className="flex gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Měsíc od</span>
                <select
                  className="input mt-1 w-40"
                  value={editEntry.preferredMonthFrom ?? ""}
                  onChange={(e) => setEditEntry((prev) => prev ? { ...prev, preferredMonthFrom: e.target.value ? Number(e.target.value) : undefined } : null)}
                  aria-label="Měsíc od"
                >
                  <option value="">—</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i + 1}>{i + 1}. {name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Měsíc do</span>
                <select
                  className="input mt-1 w-40"
                  value={editEntry.preferredMonthTo ?? ""}
                  onChange={(e) => setEditEntry((prev) => prev ? { ...prev, preferredMonthTo: e.target.value ? Number(e.target.value) : undefined } : null)}
                  aria-label="Měsíc do"
                >
                  <option value="">—</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i + 1}>{i + 1}. {name}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Priorita (nižší = dříve)</span>
              <input
                type="number"
                min={0}
                className="input mt-1 w-24"
                value={editEntry.priority ?? ""}
                onChange={(e) => setEditEntry((prev) => prev ? { ...prev, priority: e.target.value === "" ? undefined : Number(e.target.value) } : null)}
                aria-label="Priorita"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Poznámka</span>
              <input
                type="text"
                className="input mt-1 w-full"
                value={editEntry.notes ?? ""}
                onChange={(e) => setEditEntry((prev) => prev ? { ...prev, notes: e.target.value || undefined } : null)}
                aria-label="Poznámka"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditEntry(null)} disabled={saving}>
                Zrušit
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Ukládám…" : "Uložit"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal open={true} onClose={() => setDeleteId(null)} title="Odstranit z čekacího listu?">
          <p className="text-sm text-gray-600">
            Opravdu chcete tento záznam z čekacího listu odstranit?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setDeleteId(null)}>
              Zrušit
            </button>
            <button type="button" className="btn-primary bg-red-600 hover:bg-red-700" onClick={handleConfirmDelete}>
              Odstranit
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
