"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { format } from "@/lib/utils/date";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import type { Notification } from "@/lib/contracts/notifications";

export default function ReceptionAppointmentDetailPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [appointment, setAppointment] = useState<Awaited<ReturnType<typeof api.appointments.get>>>(null);
  const [settings, setSettings] = useState<{ freeCancelHours: number } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refund, setRefund] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    api.appointments.get(id).then(setAppointment);
    api.settings.get().then(setSettings);
  }, [id]);

  useEffect(() => {
    if (!appointment) return;
    const load = async (): Promise<void> => {
      const byApp = await api.notifications.list({ appointmentId: id, limit: 100 });
      if (appointment.blockId) {
        const byBlock = await api.notifications.list({
          blockId: appointment.blockId,
          limit: 100,
        });
        const seen = new Set(byApp.map((n) => n.id));
        const merged = [...byApp];
        for (const n of byBlock) {
          if (!seen.has(n.id)) {
            seen.add(n.id);
            merged.push(n);
          }
        }
        merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setNotifications(merged);
      } else {
        setNotifications(byApp);
      }
    };
    void load();
  }, [appointment, id]);

  const handleCancel = async (): Promise<void> => {
    try {
      await api.appointments.cancel(id, { refund, reason });
      router.push("/reception/calendar");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Zrušení selhalo");
    } finally {
      setCancelOpen(false);
    }
  };

  if (!appointment) return <p className="text-gray-600">Načítám…</p>;

  const freeCancelHours = settings?.freeCancelHours ?? 48;
  const start = new Date(appointment.startAt);
  const canRefund =
    appointment.paymentStatus === "PAID" &&
    (start.getTime() - Date.now()) / (1000 * 60 * 60) >= freeCancelHours;

  return (
    <div className="space-y-6">
      <Link href="/reception/calendar" className="text-sm text-primary-600 hover:underline">
        ← Kalendář
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">
        Rezervace {appointment.blockId ? "(blok)" : ""}
      </h1>
      <div className="card max-w-lg space-y-2 p-4">
        <p><strong>Začátek:</strong> {format(start, "datetime")}</p>
        <p><strong>Stav:</strong> {appointment.status}</p>
        <p><strong>Platba:</strong> {appointment.paymentStatus}</p>
        {appointment.internalNotes && <p><strong>Poznámky:</strong> {appointment.internalNotes}</p>}
      </div>
      {appointment.paymentStatus === "UNPAID" && appointment.status !== "CANCELLED" && (
        <button
          type="button"
          className="btn-primary"
          onClick={async () => {
            try {
              await api.appointments.update(id, { paymentStatus: "PAID" });
              setAppointment((prev) => (prev ? { ...prev, paymentStatus: "PAID" } : null));
            } catch (e) {
              alert(e instanceof Error ? e.message : "Chyba");
            }
          }}
        >
          Označit jako zaplaceno (bez kreditu)
        </button>
      )}
      <section className="max-w-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Oznámení k této rezervaci</h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-gray-500">K této rezervaci nebyla odeslána žádná oznámení.</p>
        ) : (
          <ul className="space-y-2 rounded border border-gray-200 bg-white p-4">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="flex flex-col gap-1 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-xs text-gray-500">
                  {format(new Date(n.createdAt), "datetime")} · {n.channel}
                  {n.read ? " · Přečteno" : ""}
                </span>
                {n.title && <span className="font-medium text-gray-800">{n.title}</span>}
                <span className="text-sm text-gray-700">{n.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {appointment.status !== "CANCELLED" && new Date(appointment.startAt) > new Date() && (
        <>
          <button
            type="button"
            className="btn-danger"
            onClick={() => setCancelOpen(true)}
          >
            Zrušit termín
          </button>
          <ConfirmDialog
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            onConfirm={handleCancel}
            title="Zrušit termín?"
            message={
              <>
                Zrušit termín {format(start, "datetime")}?
                {canRefund && " Můžete vrátit platbu na kredity."}
                <div className="mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={refund}
                      onChange={(e) => setRefund(e.target.checked)}
                    />
                    Vrátit platbu (recepce)
                  </label>
                  <input
                    type="text"
                    placeholder="Důvod (povinné pro refund)"
                    className="input mt-2"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </>
            }
            confirmLabel="Zrušit"
            variant="danger"
          />
        </>
      )}
    </div>
  );
}
