"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import type { User } from "@/lib/contracts/users";
import type { Service } from "@/lib/contracts/services";
import type { Room } from "@/lib/contracts/rooms";

function NewAppointmentForm(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const employeeIdParam = searchParams.get("employeeId");

  const [clients, setClients] = useState<User[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState(employeeIdParam ?? "");
  const [serviceId, setServiceId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [startAt, setStartAt] = useState(fromParam ?? "");
  const [endAt, setEndAt] = useState(toParam ?? "");

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
        if (!employeeIdParam && e.users[0]) setEmployeeId(e.users[0].id);
        if (!serviceId && s[0]) setServiceId(s[0].id);
        if (!roomId && r[0]) setRoomId(r[0].id);
      })
      .finally(() => setLoading(false));
    // Load options once on mount; employeeIdParam only used for initial employee selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeIdParam]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!clientId || !serviceId || !roomId || !startAt || !endAt) {
      toast("Vyplňte všechna pole (terapeut může zůstat nevybraný – klient-only rezervace).", "error");
      return;
    }
    setSaving(true);
    try {
      const app = await api.appointments.create({
        clientId,
        serviceId,
        roomId,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        ...(employeeId ? { employeeId } : {}),
      });
      toast("Rezervace byla vytvořena.", "success");
      router.push(`/reception/appointments/${app.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Rezervace selhala", "error");
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
      <h1 className="text-2xl font-bold text-gray-900">Nová rezervace</h1>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
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
            Terapeut (volitelné – nevyplněno = klient-only, terapeut se může přihlásit později)
          </label>
          <select
            id="employee"
            className="input mt-1 w-full"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">— bez terapeuta (klient-only) —</option>
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
          <label htmlFor="startAt" className="block text-sm font-medium text-gray-700">
            Začátek *
          </label>
          <input
            id="startAt"
            type="datetime-local"
            required
            className="input mt-1 w-full"
            value={
              startAt
                ? (() => {
                    const d = new Date(startAt);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                  })()
                : ""
            }
            onChange={(e) => setStartAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
          />
        </div>
        <div>
          <label htmlFor="endAt" className="block text-sm font-medium text-gray-700">
            Konec *
          </label>
          <input
            id="endAt"
            type="datetime-local"
            required
            className="input mt-1 w-full"
            value={
              endAt
                ? (() => {
                    const d = new Date(endAt);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                  })()
                : ""
            }
            onChange={(e) => setEndAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Ukládám…" : "Vytvořit rezervaci"}
          </button>
          <Link href="/reception/calendar" className="btn-secondary">
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ReceptionNewAppointmentPage(): React.ReactElement {
  return (
    <Suspense fallback={<p className="text-gray-600">Načítám…</p>}>
      <NewAppointmentForm />
    </Suspense>
  );
}
