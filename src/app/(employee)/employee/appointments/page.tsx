"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { format } from "@/lib/utils/date";
import { DataTable } from "@/components/tables/DataTable";
import type { Appointment } from "@/lib/contracts/appointments";
import type { User } from "@/lib/contracts/users";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Naplánováno",
  PAID: "Zaplaceno",
  UNPAID: "Nezaplaceno",
  COMPLETED: "Dokončeno",
  CANCELLED: "Zrušeno",
  INVOICED: "Vyfakturováno",
  NO_SHOW: "Nedostavil se",
};

export default function EmployeeAppointmentsPage(): React.ReactElement {
  const session = getSession();
  const employeeId = session?.userId ?? "";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    Promise.all([
      api.appointments.list({ employeeId }),
      api.users.list({ role: "CLIENT" }).then((r) => r.users),
    ])
      .then(([apps, users]) => {
        setAppointments(apps);
        setUserMap(new Map(users.map((u: User) => [u.id, u.name])));
      })
      .finally(() => setLoading(false));
  }, [employeeId]);

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Moje rezervace</h1>
      <Link
        href="/employee/calendar"
        className="inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
      >
        Kalendář
      </Link>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable<Appointment>
          columns={[
            {
              key: "startAt",
              header: "Datum a čas",
              render: (r) => format(new Date(r.startAt), "datetime"),
            },
            {
              key: "clientId",
              header: "Klient",
              render: (r) => userMap.get(r.clientId) ?? r.clientId,
            },
            {
              key: "status",
              header: "Stav",
              render: (r) => (
                <span
                  className={
                    r.status === "CANCELLED"
                      ? "text-red-600"
                      : r.status === "COMPLETED"
                        ? "text-emerald-600"
                        : "text-gray-700"
                  }
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              ),
            },
            {
              key: "actions",
              header: "Akce",
              render: (r) =>
                r.status !== "CANCELLED" ? (
                  <Link
                    href={`/employee/appointments/${r.id}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Detail
                  </Link>
                ) : null,
            },
          ]}
          data={appointments}
          keyExtractor={(r) => r.id}
          emptyMessage="Žádné rezervace."
        />
      </div>
    </div>
  );
}
