"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import { format, addDays } from "@/lib/utils/date";
import type { SlotOfferApproval } from "@/lib/contracts/slot-offer-approval";
import type { User } from "@/lib/contracts/users";
import type { Appointment } from "@/lib/contracts/appointments";

const PUSH_TITLE_7_DAYS = "Poslední termíny na příštích 7 dní!";

export default function AdminSlotOfferApprovalsPage(): React.ReactElement {
  const toast = useToast();
  const [approvals, setApprovals] = useState<SlotOfferApproval[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [users, setUsers] = useState<Map<string, string>>(new Map());
  const [createOpen, setCreateOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<Set<string>>(new Set());
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [messageTemplate, setMessageTemplate] = useState("");
  const [pushTitle, setPushTitle] = useState("");
  const [filterSevenDays, setFilterSevenDays] = useState(false);
  const [creating, setCreating] = useState(false);

  const now = useMemo(() => new Date(), [createOpen]);
  const sevenDaysLater = useMemo(() => addDays(now, 7), [now]);
  const displayedAppointments = useMemo(() => {
    if (!filterSevenDays) return appointments;
    return appointments.filter((a) => {
      const start = new Date(a.startAt).getTime();
      return start >= now.getTime() && start <= sevenDaysLater.getTime();
    });
  }, [appointments, filterSevenDays, now, sevenDaysLater]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.admin.slotOfferApprovals.list({ status: "PENDING", limit: 50 }),
      api.users.list({}).then((r) => r.users),
    ])
      .then(([res, userList]) => {
        setApprovals(res.approvals);
        setTotal(res.total);
        const map = new Map<string, string>();
        (userList as User[]).forEach((u) => map.set(u.id, u.name));
        setUsers(map);
      })
      .catch((e) => toast(e instanceof Error ? e.message : "Chyba načtení", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!createOpen) return;
    api.appointments.list({}).then(setAppointments);
    api.users.list({ role: "CLIENT" }).then((r) => setClients(r.users));
  }, [createOpen]);

  const handleDecide = async (id: string, status: "APPROVED" | "REJECTED"): Promise<void> => {
    setDecidingId(id);
    try {
      await api.admin.slotOfferApprovals.decide(id, { status });
      toast(status === "APPROVED" ? "Nabídka byla schválena; klienti dostali notifikace." : "Nabídka byla odmítnuta.", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    } finally {
      setDecidingId(null);
    }
  };

  const toggleAppointment = (id: string): void => {
    setSelectedAppointmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleClient = (id: string): void => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllClients = (): void => {
    setSelectedClientIds(new Set(clients.map((c) => c.id)));
    toast(`Vybráno ${clients.length} klientů.`, "success");
  };

  const handleUseTemplate7Days = async (): void => {
    const selectedAppointments = appointments
      .filter((a) => selectedAppointmentIds.has(a.id))
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    if (selectedAppointments.length === 0) {
      toast("Nejprve vyberte sloty (termíny).", "error");
      return;
    }
    try {
      const s = await api.settings.get();
      const greeting = (s as { slotOfferGreeting?: string }).slotOfferGreeting?.trim() ?? "Dobrý den,";
      const closing = (s as { slotOfferClosing?: string }).slotOfferClosing?.trim() ?? "Rezervujte si termín v aplikaci.";
      const lines = selectedAppointments.map((a) => `• ${format(new Date(a.startAt), "datetime")}`);
      const message = `${greeting}\n\n${lines.join("\n")}\n\n${closing}`;
      setMessageTemplate(message);
      setPushTitle(PUSH_TITLE_7_DAYS);
      toast("Šablona doplněna (oslovení + seznam + závěr). Push bude s titulkem „Poslední termíny na příštích 7 dní!“.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba načtení nastavení", "error");
    }
  };

  const handleCreateDraft = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const appointmentIds = Array.from(selectedAppointmentIds);
    const clientIds = Array.from(selectedClientIds);
    if (!appointmentIds.length || !clientIds.length || !messageTemplate.trim()) {
      toast("Vyberte alespoň jeden slot, alespoň jednoho klienta a napište zprávu.", "error");
      return;
    }
    setCreating(true);
    try {
      await api.admin.slotOfferApprovals.create({
        appointmentIds,
        clientIds,
        messageTemplate: messageTemplate.trim(),
        pushTitle: pushTitle.trim() || undefined,
      });
      toast("Nabídka byla vytvořena. Admin a recepce dostali upozornění; po schválení dostanou klienti notifikaci a e-mail.", "success");
      setCreateOpen(false);
      setSelectedAppointmentIds(new Set());
      setSelectedClientIds(new Set());
      setMessageTemplate("");
      setPushTitle("");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Schválení nabídek slotů</h1>
      <p className="text-sm text-gray-600">
        Návrhy nabídek uvolněných termínů (režim Manual). Schválením se odešlou notifikace vybraným klientům.
      </p>

      <section className="card p-4">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setCreateOpen((o) => !o)}
          aria-expanded={createOpen}
          aria-controls="create-draft-form"
        >
          {createOpen ? "Zavřít formulář" : "Vytvořit nabídku (draft)"}
        </button>
        {createOpen && (
          <form id="create-draft-form" onSubmit={handleCreateDraft} className="mt-4 space-y-4 border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600">
              Vyberte sloty (rezervace) a klienty, kterým chcete nabídku poslat. Po schválení dostanou klienti in-app notifikaci a e-mail.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filterSevenDays}
                  onChange={(e) => setFilterSevenDays(e.target.checked)}
                  className="rounded border-gray-300"
                  aria-label="Pouze termíny na příštích 7 dní"
                />
                <span className="text-sm">Pouze termíny na příštích 7 dní</span>
              </label>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={handleSelectAllClients}
                aria-label="Vybrat všechny klienty"
              >
                Vybrat všechny klienty
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={handleUseTemplate7Days}
                aria-label="Použít šablonu 7 dní (oslovení + seznam + závěr)"
              >
                Použít šablonu 7 dní
              </button>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700">Sloty (rezervace){filterSevenDays ? " — příštích 7 dní" : ""}</span>
              <div className="mt-1 max-h-40 overflow-y-auto rounded border border-gray-200 bg-white p-2">
                {displayedAppointments.length === 0 ? (
                  <p className="text-sm text-gray-500">{appointments.length === 0 ? "Načítám…" : filterSevenDays ? "Žádné termíny v příštích 7 dnech." : "Žádné sloty."}</p>
                ) : (
                  <ul className="space-y-1">
                    {displayedAppointments.slice(0, 80).map((a) => (
                      <li key={a.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`app-${a.id}`}
                          checked={selectedAppointmentIds.has(a.id)}
                          onChange={() => toggleAppointment(a.id)}
                          className="rounded border-gray-300"
                          aria-label={`Slot ${format(new Date(a.startAt), "datetime")}`}
                        />
                        <label htmlFor={`app-${a.id}`} className="text-sm">
                          {format(new Date(a.startAt), "datetime")} — {a.status}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700">Klienti</span>
              <div className="mt-1 max-h-40 overflow-y-auto rounded border border-gray-200 bg-white p-2">
                {clients.length === 0 ? (
                  <p className="text-sm text-gray-500">Žádní klienti</p>
                ) : (
                  <ul className="space-y-1">
                    {clients.map((c) => (
                      <li key={c.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`client-${c.id}`}
                          checked={selectedClientIds.has(c.id)}
                          onChange={() => toggleClient(c.id)}
                          className="rounded border-gray-300"
                          aria-label={c.name}
                        />
                        <label htmlFor={`client-${c.id}`} className="text-sm">
                          {c.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <label>
              <span className="block text-sm font-medium text-gray-700">Text zprávy pro klienty (push + e-mail)</span>
              {pushTitle && (
                <p className="text-xs text-gray-500 mt-0.5">Titulek push: {pushTitle}</p>
              )}
              <textarea
                className="input mt-1 w-full min-h-[100px]"
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                placeholder="Např. Dobrý den, níže termíny na příštích 7 dní. Rezervujte si v aplikaci."
                rows={4}
                required
                aria-label="Text zprávy"
              />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? "Vytvářím…" : "Vytvořit nabídku (draft)"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Zrušit
              </button>
            </div>
          </form>
        )}
      </section>

      {approvals.length === 0 ? (
        <p className="rounded border border-gray-200 bg-gray-50 p-4 text-gray-600">Žádné čekající schválení.</p>
      ) : (
        <ul className="space-y-4">
          {approvals.map((a) => (
            <li key={a.id} className="card flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">
                  {a.appointmentIds.length} slot(ů) → {a.clientIds.length} klientů
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Klienti: {a.clientIds.map((id) => users.get(id) ?? id).join(", ")}
                </p>
                <p className="mt-2 text-sm text-gray-700">{a.messageTemplate}</p>
                <p className="mt-1 text-xs text-gray-500">Vytvořeno: {format(new Date(a.createdAt), "datetime")}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={decidingId !== null}
                  onClick={() => handleDecide(a.id, "APPROVED")}
                  aria-label="Schválit"
                >
                  {decidingId === a.id ? "…" : "Schválit"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={decidingId !== null}
                  onClick={() => handleDecide(a.id, "REJECTED")}
                  aria-label="Odmítnout"
                >
                  Odmítnout
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
