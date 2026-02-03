"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { format } from "@/lib/utils/date";

export default function EmployeeAppointmentDetailPage(): React.ReactElement {
  const params = useParams();
  const id = params.id as string;
  const session = getSession();
  const [appointment, setAppointment] = useState<Awaited<ReturnType<typeof api.appointments.get>>>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingUp, setSigningUp] = useState(false);

  const loadAppointment = useCallback((): void => {
    api.appointments.get(id).then((a) => {
      setAppointment(a);
      setInternalNotes(a?.internalNotes ?? "");
    });
  }, [id]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  const handleSaveNotes = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.appointments.update(id, { internalNotes });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Chyba");
    } finally {
      setSaving(false);
    }
  };

  const handleSignUp = async (): Promise<void> => {
    if (!session?.userId) return;
    setSigningUp(true);
    try {
      await api.appointments.update(id, { employeeId: session.userId });
      loadAppointment();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Přihlášení k termínu selhalo");
    } finally {
      setSigningUp(false);
    }
  };

  if (!appointment) return <p className="text-gray-600">Načítám…</p>;

  const isUnassigned = !appointment.employeeId;

  return (
    <div className="space-y-6">
      <Link href="/employee/calendar" className="text-sm text-primary-600 hover:underline">
        ← Kalendář
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Termín {id}</h1>
      {isUnassigned && (
        <div className="rounded border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-900">Volný termín (bez terapeuta)</p>
          <p className="mt-1 text-sm text-amber-800">
            Tento termín byl vytvořen pro klienta bez přiřazeného terapeuta. Můžete se k němu přihlásit.
          </p>
          <button
            type="button"
            className="btn-primary mt-3"
            onClick={handleSignUp}
            disabled={signingUp}
          >
            {signingUp ? "Přihlašuji…" : "Přihlásit se k termínu"}
          </button>
        </div>
      )}
      <div className="card max-w-lg space-y-2 p-4">
        <p><strong>Začátek:</strong> {format(new Date(appointment.startAt), "datetime")}</p>
        <p><strong>Stav:</strong> {appointment.status}</p>
        <p><strong>Klient:</strong> {appointment.clientId}</p>
      </div>
      <form onSubmit={handleSaveNotes} className="space-y-2">
        <label htmlFor="notes" className="block font-medium text-gray-700">
          Interní poznámky
        </label>
        <textarea
          id="notes"
          className="input min-h-[100px]"
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Ukládám…" : "Uložit"}
        </button>
      </form>
      <Link href={`/employee/clients/${appointment.clientId}/reports`} className="btn-secondary inline-block">
        Zprávy klienta
      </Link>
    </div>
  );
}
