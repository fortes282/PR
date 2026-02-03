"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { startOfWeek, addDays, format } from "@/lib/utils/date";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarMonthNav } from "@/components/calendar/CalendarMonthNav";
import type { Appointment } from "@/lib/contracts/appointments";
import type { User } from "@/lib/contracts/users";

const WORK_MINUTES_PER_DAY = 9 * 60; // 8–17

export default function ReceptionCalendarPage(): React.ReactElement {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [therapistId, setTherapistId] = useState<string>("");
  const [availabilitySlots, setAvailabilitySlots] = useState<{ startAt: string; endAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const from = weekStart.toISOString();
  const to = addDays(weekStart, 7).toISOString();

  useEffect(() => {
    Promise.all([
      api.appointments.list({ from, to }),
      api.users.list({ role: "CLIENT" }),
      api.users.list({ role: "EMPLOYEE" }),
    ])
      .then(([apps, clients, employees]) => {
        setAppointments(apps);
        setUsers([...clients.users, ...employees.users]);
      })
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => {
    if (!therapistId) {
      setAvailabilitySlots([]);
      return;
    }
    api.availability
      .list({ employeeId: therapistId, from, to })
      .then(setAvailabilitySlots)
      .catch(() => setAvailabilitySlots([]));
  }, [therapistId, from, to]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);
  const slots = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== "CANCELLED")
        .filter((a) => !therapistId || a.employeeId === therapistId)
        .map((a) => ({
          id: a.id,
          startAt: a.startAt,
          endAt: a.endAt,
          clientName: userMap.get(a.clientId) ?? a.clientId,
          title: a.blockId ? "Blok" : undefined,
          employeeId: a.employeeId,
        })),
    [appointments, userMap, therapistId]
  );

  const dayOccupancyPercent = useMemo(() => {
    if (!therapistId) return undefined;
    const start = startOfWeek(weekStart);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const therapistAppointments = appointments.filter(
      (a) => a.employeeId === therapistId && a.status !== "CANCELLED"
    );
    return days.map((day) => {
      const dayStr = format(day, "date");
      const dayApps = therapistAppointments.filter(
        (a) => format(new Date(a.startAt), "date") === dayStr
      );
      const minutes = dayApps.reduce((sum, a) => {
        const s = new Date(a.startAt).getTime();
        const e = new Date(a.endAt).getTime();
        return sum + (e - s) / (1000 * 60);
      }, 0);
      return Math.min(100, Math.round((minutes / WORK_MINUTES_PER_DAY) * 100));
    });
  }, [appointments, therapistId, weekStart]);

  const availableSlotStarts = useMemo(() => {
    if (availabilitySlots.length === 0) return undefined;
    return new Set(
      availabilitySlots.map((s) => {
        const d = new Date(s.startAt);
        return `${format(d, "date")}T${String(d.getHours()).padStart(2, "0")}`;
      })
    );
  }, [availabilitySlots]);

  const therapists = useMemo(
    () => users.filter((u) => u.role === "EMPLOYEE"),
    [users]
  );

  const handleSlotClick = (slot: { id: string }): void => {
    router.push(`/reception/appointments/${slot.id}`);
  };

  const handleEmptySlotClick = (date: Date, hour: number): void => {
    const startAt = new Date(date);
    startAt.setHours(hour, 0, 0, 0);
    const endAt = new Date(startAt);
    endAt.setHours(hour + 1, 0, 0, 0);
    const params = new URLSearchParams({
      from: startAt.toISOString(),
      to: endAt.toISOString(),
    });
    if (therapistId) params.set("employeeId", therapistId);
    router.push(`/reception/appointments/new?${params}`);
  };

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Kalendář (týden)</h1>
      <div className="flex flex-wrap items-center gap-6">
        <CalendarMonthNav
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          maxMonth={addDays(new Date(), 365)}
        />
        <Link
          href="/reception/appointments/new-block"
          className="rounded border border-primary-600 bg-white px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50"
        >
          Nový intenzivní blok
        </Link>
        <div className="flex items-center gap-2">
          <label htmlFor="therapist-filter" className="text-sm font-medium text-gray-700">
            Terapeut:
          </label>
          <select
            id="therapist-filter"
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
            value={therapistId}
            onChange={(e) => setTherapistId(e.target.value)}
          >
            <option value="">Všichni</option>
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <CalendarWeekView
        weekStart={weekStart}
        slots={slots}
        onSlotClick={handleSlotClick}
        onEmptySlotClick={handleEmptySlotClick}
        availableSlotStarts={therapistId ? availableSlotStarts : undefined}
        dayOccupancyPercent={dayOccupancyPercent}
      />
    </div>
  );
}
