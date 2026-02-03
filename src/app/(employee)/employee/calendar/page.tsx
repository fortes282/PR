"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { startOfWeek, addDays } from "@/lib/utils/date";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarMonthNav } from "@/components/calendar/CalendarMonthNav";
import type { Appointment } from "@/lib/contracts/appointments";
import type { User } from "@/lib/contracts/users";

export default function EmployeeCalendarPage(): React.ReactElement {
  const router = useRouter();
  const session = getSession();
  const employeeId = session?.userId ?? "";
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const from = weekStart.toISOString();
  const to = addDays(weekStart, 7).toISOString();

  useEffect(() => {
    if (!employeeId) return;
    Promise.all([
      api.appointments.list({ from, to }),
      api.users.list({ role: "CLIENT" }),
    ])
      .then(([apps, u]) => {
        setAppointments(apps);
        setUsers(u.users);
      })
      .finally(() => setLoading(false));
  }, [employeeId, from, to]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);
  const slots = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== "CANCELLED")
        .filter((a) => !a.employeeId || a.employeeId === employeeId)
        .map((a) => ({
          id: a.id,
          startAt: a.startAt,
          endAt: a.endAt,
          clientName: userMap.get(a.clientId) ?? a.clientId,
          title: a.blockId ? "Blok" : !a.employeeId ? "Volný" : undefined,
          employeeId: a.employeeId,
        })),
    [appointments, userMap, employeeId]
  );

  const handleSlotClick = (slot: { id: string }): void => {
    router.push(`/employee/appointments/${slot.id}`);
  };

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Můj kalendář</h1>
      <CalendarMonthNav
        weekStart={weekStart}
        onWeekChange={setWeekStart}
        maxMonth={addDays(new Date(), 365)}
      />
      <CalendarWeekView weekStart={weekStart} slots={slots} onSlotClick={handleSlotClick} />
    </div>
  );
}
