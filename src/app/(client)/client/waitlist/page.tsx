"use client";

import { useCallback, useEffect, useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { useToast } from "@/components/layout/Toaster";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import type { WaitingListEntry } from "@/lib/contracts/waitlist";
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

export default function ClientWaitlistPage(): React.ReactElement {
  const session = getSession();
  const toast = useToast();
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [monthFrom, setMonthFrom] = useState<number>(1);
  const [monthTo, setMonthTo] = useState<number>(12);

  const clientId = session?.userId ?? "";

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.waitlist.list().then((list) => setEntries(list.filter((e) => e.clientId === clientId))),
      api.services.list().then(setServices),
    ]).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!serviceId.trim()) {
      toast("Vyberte službu.", "error");
      return;
    }
    if (monthFrom > monthTo) {
      toast("Měsíc „od“ musí být před nebo roven měsíci „do“.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await api.waitlist.create({
        clientId,
        serviceId: serviceId.trim(),
        preferredMonthFrom: monthFrom,
        preferredMonthTo: monthTo,
      });
      toast("Přidáno na čekací list.", "success");
      setShowForm(false);
      setServiceId("");
      setMonthFrom(1);
      setMonthTo(12);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Chyba", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string): Promise<void> => {
    try {
      await api.waitlist.delete(id);
      toast("Přihláška z čekacího listu odebrána.", "success");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Chyba", "error");
    }
  };

  if (loading) return <PageSkeleton lines={4} />;

  const serviceName = (id: string): string => services.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 font-display">
        <ListChecks className="h-7 w-7 text-primary-600" aria-hidden />
        Čekací list
      </h1>
      <p className="text-gray-600">
        Můžete se přidat na čekací list k vybrané službě (např. individuální terapie) a zvolit rozmezí měsíců na celý rok dopředu, kdy vám termín vyhovuje.
      </p>

      {!showForm ? (
        <button
          type="button"
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowForm(true)}
          aria-expanded={false}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Přidat na čekací list
        </button>
      ) : (
        <section className="card space-y-4 p-4">
          <h2 className="font-medium text-gray-900">Přidat na čekací list</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Služba</span>
              <select
                className="input mt-1 w-full max-w-md"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
                aria-label="Služba"
              >
                <option value="">— vyberte službu —</option>
                {services.filter((s) => s.active !== false).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-6">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Měsíc od (1–12)</span>
                <select
                  className="input mt-1 w-32"
                  value={monthFrom}
                  onChange={(e) => setMonthFrom(Number(e.target.value))}
                  aria-label="Měsíc od"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i + 1}>{i + 1}. {name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Měsíc do (1–12)</span>
                <select
                  className="input mt-1 w-32"
                  value={monthTo}
                  onChange={(e) => setMonthTo(Number(e.target.value))}
                  aria-label="Měsíc do"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i + 1}>{i + 1}. {name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Odesílám…" : "Přidat"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Zrušit
              </button>
            </div>
          </form>
        </section>
      )}

      {entries.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nejste na čekacím listu"
          description="Přidejte se výběrem služby a rozmezí měsíců. Až se uvolní termín, můžete dostat nabídku."
          variant="card"
        />
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <span className="font-medium text-gray-900">{serviceName(e.serviceId)}</span>
                <span className="ml-2 text-sm text-gray-600">
                  Měsíce: {monthLabel(e.preferredMonthFrom, e.preferredMonthTo)}
                </span>
                {e.notes && <p className="text-sm text-gray-500 mt-0.5">{e.notes}</p>}
              </div>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => handleRemove(e.id)}
                aria-label={`Odebrat přihlášku ${serviceName(e.serviceId)} z čekacího listu`}
              >
                Odebrat
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
