"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { format } from "@/lib/utils/date";
import { DataTable } from "@/components/tables/DataTable";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import type { Appointment } from "@/lib/contracts/appointments";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Naplánováno",
  PAID: "Zaplaceno",
  UNPAID: "Nezaplaceno",
  COMPLETED: "Dokončeno",
  CANCELLED: "Zrušeno",
  INVOICED: "Vyfakturováno",
  NO_SHOW: "Nedostavil se",
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Čeká",
  PAID: "Zaplaceno",
  UNPAID: "Nezaplaceno",
  REFUNDED: "Vráceno",
  INVOICED: "Vyfakturováno",
};

export default function ClientAppointmentsPage(): React.ReactElement {
  const session = getSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ freeCancelHours: number } | null>(null);

  const clientId = session?.userId ?? "";

  const load = (): void => {
    if (!clientId) return;
    api.appointments.list({ clientId }).then(setAppointments).finally(() => setLoading(false));
    api.settings.get().then(setSettings);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable, avoid re-fetch loop
  }, [clientId]);

  const handleCancel = (id: string): void => {
    setCancelId(id);
  };

  const confirmCancel = async (): Promise<void> => {
    if (!cancelId) return;
    try {
      await api.appointments.cancel(cancelId);
      load();
      setCancelId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Zrušení selhalo");
    }
  };

  const app = cancelId ? appointments.find((a) => a.id === cancelId) : null;
  const freeCancelHours = settings?.freeCancelHours ?? 48;
  const canRefund = app
    ? app.paymentStatus === "PAID" &&
      (new Date(app.startAt).getTime() - Date.now()) / (1000 * 60 * 60) >= freeCancelHours
    : false;

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Moje rezervace</h1>
      <Link
        href="/client/book"
        className="inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
      >
        Rezervovat termín
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
              key: "paymentStatus",
              header: "Platba",
              render: (r) => (
                <span className="text-gray-700">
                  {PAYMENT_LABELS[r.paymentStatus] ?? r.paymentStatus}
                </span>
              ),
            },
            {
              key: "actions",
              header: "Akce",
              render: (r) =>
                r.status !== "CANCELLED" && new Date(r.startAt) > new Date() ? (
                  <button
                    type="button"
                    className="rounded border border-red-200 bg-white px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                    onClick={() => handleCancel(r.id)}
                  >
                    Zrušit
                  </button>
                ) : null,
            },
          ]}
          data={appointments}
          keyExtractor={(r) => r.id}
          emptyMessage="Žádné rezervace."
        />
      </div>

      <ConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={confirmCancel}
        title="Zrušit termín?"
        message={
          app
            ? `Zrušit termín ${format(new Date(app.startAt), "datetime")}? ${
                canRefund ? "Vrátíme platbu na kredity (zrušení včas)." : "Platba se nevrací (po lhůtě)."
              }`
            : ""
        }
        confirmLabel="Zrušit termín"
        variant="danger"
      />
    </div>
  );
}
