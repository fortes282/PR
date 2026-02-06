"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { startOfDay, addDays, subDays, format } from "@/lib/utils/date";
import { DayTimelineView, type TimelineSlot } from "@/components/calendar/DayTimelineView";
import type { Appointment } from "@/lib/contracts/appointments";
import type { User } from "@/lib/contracts/users";

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

export default function EmployeeCalendarPage(): React.ReactElement {
  const router = useRouter();
  const session = getSession();
  const employeeId = session?.userId ?? "";
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const rangeStart = subDays(selectedDate, 7);
  const rangeEnd = addDays(selectedDate, 7);
  const fromStr = rangeStart.toISOString();
  const toStr = rangeEnd.toISOString();

  useEffect(() => {
    if (!employeeId) return;
    Promise.all([
      api.appointments.list({ from: fromStr, to: toStr }),
      api.users.list({ role: "CLIENT" }),
    ])
      .then(([apps, u]) => {
        setAppointments(apps);
        setUsers(u.users);
      })
      .finally(() => setLoading(false));
  }, [employeeId, fromStr, toStr]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);
  const slots: TimelineSlot[] = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== "CANCELLED")
        .filter((a) => !a.employeeId || a.employeeId === employeeId)
        .map((a) => ({
          id: a.id,
          startAt: a.startAt,
          endAt: a.endAt ?? a.startAt,
          clientName: userMap.get(a.clientId) ?? a.clientId,
          clientId: a.clientId,
          title: a.blockId ? "Blok" : !a.employeeId ? "Volný" : undefined,
        })),
    [appointments, userMap, employeeId]
  );

  const handleSlotClick = (slot: TimelineSlot): void => {
    router.push(`/employee/appointments/${slot.id}`);
  };

  const goToday = (): void => setSelectedDate(startOfDay(new Date()));
  const goPrev = (): void => setSelectedDate((d) => subDays(d, 1));
  const goNext = (): void => setSelectedDate((d) => addDays(d, 1));
  const isToday =
    format(selectedDate, "date") === format(new Date(), "date");

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Můj kalendář</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            onClick={goPrev}
            aria-label="Předchozí den"
          >
            ←
          </button>
          <button
            type="button"
            className="rounded border border-primary-600 bg-white px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50"
            onClick={goToday}
            aria-label="Dnes"
          >
            Dnes
          </button>
          <button
            type="button"
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            onClick={goNext}
            aria-label="Následující den"
          >
            →
          </button>
          <span className="ml-2 text-lg font-semibold text-gray-800">
            {format(selectedDate, "date")} – {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </span>
        </div>
      </div>

      {isToday && (
        <p className="text-sm text-gray-600">
          Zvýrazněná čára „Teď” ukazuje aktuální čas. Kliknutím na termín přejdete na detail klienta.
        </p>
      )}

      <DayTimelineView
        date={selectedDate}
        slots={slots}
        onSlotClick={handleSlotClick}
        showNowLine={true}
      />
    </div>
  );
}
