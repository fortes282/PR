"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import type { User } from "@/lib/contracts/users";
import type { Service } from "@/lib/contracts/services";
import type { Room } from "@/lib/contracts/rooms";
import type { TherapyBlockSlot } from "@/lib/contracts/appointments";

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fromDatetimeLocal(value: string): string {
  return value ? new Date(value).toISOString() : "";
}

export default function ReceptionNewBlockPage(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [clients, setClients] = useState<User[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [slots, setSlots] = useState<TherapyBlockSlot[]>([
    { startAt: "", endAt: "" },
  ]);

  useEffect(() => {
    Promise.all([
      api.users.list({ role: "CLIENT" }),
      api.users.list({ role: "EMPLOYEE" }),
      api.services.list(),
      api.rooms.list(),
    ])
      .then(([c, e, s, r]) => {
        setClients(c.users);
        setEmployees(e.users);
        setServices(s);
        setRooms(r);
        if (e.users[0]) setEmployeeId((prev) => prev || e.users[0].id);
        if (s[0]) setServiceId((prev) => prev || s[0].id);
        if (r[0]) setRoomId((prev) => prev || r[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const addSlot = (): void => {
    setSlots((prev) => [...prev, { startAt: "", endAt: "" }]);
  };

  const removeSlot = (index: number): void => {
    setSlots((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateSlot = (index: number, field: "startAt" | "endAt", value: string): void => {
    const iso = fromDatetimeLocal(value);
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: iso } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const validSlots = slots.filter((s) => s.startAt && s.endAt && new Date(s.endAt) > new Date(s.startAt));
    if (!clientId || !employeeId || !serviceId || !roomId || validSlots.length === 0) {
      toast("Vyplňte všechna pole a alespoň jeden platný slot (začátek a konec).", "error");
      return;
    }
    setSaving(true);
    try {
      const { appointments } = await api.appointments.createBlock({
        clientId,
        employeeId,
        serviceId,
        roomId,
        slots: validSlots,
      });
      toast("Blok rezervací byl vytvořen.", "success");
      router.push(`/reception/appointments/${appointments[0].id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Vytvoření bloku selhalo", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <Link href="/reception/calendar" className="text-sm text-primary-600 hover:underline">
        ← Kalendář
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Nový intenzivní blok</h1>
      <p className="text-sm text-gray-600">
        Intenzivní blok = více slotů u jednoho terapeuta a klienta (mezi sloty mohou být přestávky).
        Oznámení se odešlou jako jedno.
      </p>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div>
          <label htmlFor="client" className="block text-sm font-medium text-gray-700">
            Klient *
          </label>
          <select
            id="client"
            required
            className="input mt-1 w-full"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">— vyberte —</option>
            {clients.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="employee" className="block text-sm font-medium text-gray-700">
            Terapeut *
          </label>
          <select
            id="employee"
            required
            className="input mt-1 w-full"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">— vyberte —</option>
            {employees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="service" className="block text-sm font-medium text-gray-700">
            Služba *
          </label>
          <select
            id="service"
            required
            className="input mt-1 w-full"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">— vyberte —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="room" className="block text-sm font-medium text-gray-700">
            Místnost *
          </label>
          <select
            id="room"
            required
            className="input mt-1 w-full"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            <option value="">— vyberte —</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Časové sloty *</label>
            <button
              type="button"
              className="text-sm text-primary-600 hover:underline"
              onClick={addSlot}
            >
              + Přidat slot
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Mezi sloty mohou být přestávky; přidejte tolik slotů, kolik potřebujete.
          </p>
          <div className="mt-2 space-y-2">
            {slots.map((slot, index) => (
              <div
                key={index}
                className="flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-gray-50 p-2"
              >
                <input
                  type="datetime-local"
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={toDatetimeLocal(slot.startAt)}
                  onChange={(e) => updateSlot(index, "startAt", e.target.value)}
                  aria-label={`Slot ${index + 1} začátek`}
                />
                <span className="text-gray-500">–</span>
                <input
                  type="datetime-local"
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={toDatetimeLocal(slot.endAt)}
                  onChange={(e) => updateSlot(index, "endAt", e.target.value)}
                  aria-label={`Slot ${index + 1} konec`}
                />
                <button
                  type="button"
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  onClick={() => removeSlot(index)}
                  disabled={slots.length === 1}
                  aria-label={`Odebrat slot ${index + 1}`}
                >
                  Odebrat
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Vytvářím…" : "Vytvořit intenzivní blok"}
          </button>
          <Link href="/reception/calendar" className="btn-secondary">
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  );
}
