"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { format } from "@/lib/utils/date";
import { DataTable } from "@/components/tables/DataTable";
import type { Appointment } from "@/lib/contracts/appointments";
import type { User } from "@/lib/contracts/users";

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

export default function ReceptionAppointmentsPage(): React.ReactElement {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [filterClientName, setFilterClientName] = useState("");
  const [filterTherapistId, setFilterTherapistId] = useState("");

  const filterFrom = useMemo(
    () => `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`,
    [selectedMonth, selectedYear]
  );
  const filterTo = useMemo(() => {
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    return format(lastDay, "date");
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const fromDate = new Date(filterFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(filterTo);
    toDate.setHours(23, 59, 59, 999);
    setLoading(true);
    Promise.all([
      api.appointments.list({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        ...(filterTherapistId ? { employeeId: filterTherapistId } : {}),
      }),
      api.users.list({}),
    ])
      .then(([apps, u]) => {
        setAppointments(apps);
        setUsers(u.users);
      })
      .finally(() => setLoading(false));
  }, [filterFrom, filterTo, filterTherapistId]);

  const therapists = useMemo(
    () => users.filter((u) => u.role === "EMPLOYEE"),
    [users]
  );
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  const filteredByClient = useMemo(() => {
    if (!filterClientName.trim()) return appointments;
    const q = filterClientName.toLowerCase().trim();
    return appointments.filter((a) => {
      const name = userMap.get(a.clientId) ?? "";
      return name.toLowerCase().includes(q);
    });
  }, [appointments, filterClientName, userMap]);

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Rezervace</h1>
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/reception/calendar" className="text-primary-600 hover:underline">
          Zobrazit kalendář →
        </Link>
        <Link
          href="/reception/appointments/new-block"
          className="rounded border border-primary-600 bg-white px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50"
        >
          Nový intenzivní blok
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-month" className="text-sm font-medium text-gray-700">
            Měsíc:
          </label>
          <select
            id="filter-month"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filter-year" className="text-sm font-medium text-gray-700">
            Rok:
          </label>
          <select
            id="filter-year"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1, selectedYear + 2].map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            )}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filter-client" className="text-sm font-medium text-gray-700">
            Klient:
          </label>
          <input
            id="filter-client"
            type="text"
            placeholder="Jméno klienta"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={filterClientName}
            onChange={(e) => setFilterClientName(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filter-therapist" className="text-sm font-medium text-gray-700">
            Terapeut:
          </label>
          <select
            id="filter-therapist"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={filterTherapistId}
            onChange={(e) => setFilterTherapistId(e.target.value)}
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
      <DataTable<Appointment>
        columns={[
          { key: "startAt", header: "Datum a čas", render: (r) => format(new Date(r.startAt), "datetime") },
          { key: "clientId", header: "Klient", render: (r) => userMap.get(r.clientId) ?? r.clientId },
          {
            key: "employeeId",
            header: "Terapeut",
            render: (r) =>
              r.employeeId ? (userMap.get(r.employeeId) ?? r.employeeId) : "— (volný)",
          },
          { key: "status", header: "Stav", render: (r) => (r.blockId ? `Blok · ${r.status}` : r.status) },
          {
            key: "id",
            header: "Akce",
            render: (r) => (
              <Link href={`/reception/appointments/${r.id}`} className="text-primary-600 hover:underline">
                Detail
              </Link>
            ),
          },
        ]}
        data={filteredByClient}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}
