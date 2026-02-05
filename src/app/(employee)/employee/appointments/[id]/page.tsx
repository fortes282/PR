"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { format } from "@/lib/utils/date";
import type { Appointment } from "@/lib/contracts/appointments";
import type { User } from "@/lib/contracts/users";
import type { MedicalReport } from "@/lib/contracts";

export default function EmployeeAppointmentDetailPage(): React.ReactElement {
  const params = useParams();
  const id = params.id as string;
  const session = getSession();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [client, setClient] = useState<User | null>(null);
  const [lastVisit, setLastVisit] = useState<Appointment | null>(null);
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingUp, setSigningUp] = useState(false);

  const loadAppointment = useCallback((): void => {
    api.appointments.get(id).then((a) => {
      if (!a) return;
      setAppointment(a);
      setInternalNotes(a.internalNotes ?? "");
    });
  }, [id]);

  useEffect(() => {
    loadAppointment();
  }, [loadAppointment]);

  useEffect(() => {
    if (!appointment?.clientId) return;
    const clientId = appointment.clientId;
    Promise.all([
      api.users.get(clientId),
      api.appointments.list({ clientId }),
      api.medicalReports.list(clientId),
    ]).then(([user, appointments, reports]) => {
      setClient(user ?? null);
      setMedicalReports(reports);
      const now = new Date().toISOString();
      const past = appointments
        .filter(
          (a) =>
            a.id !== id &&
            (a.status === "COMPLETED" || a.status === "PAID" || a.status === "UNPAID" || a.status === "INVOICED") &&
            (a.endAt ?? a.startAt) < now
        )
        .sort((a, b) => (b.endAt ?? b.startAt).localeCompare(a.endAt ?? a.startAt));
      setLastVisit(past[0] ?? null);
    });
  }, [appointment?.clientId, id]);

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

  const downloadReport = async (
    reportId: string,
    reportDate: string,
    type: "pdf" | "docx"
  ): Promise<void> => {
    try {
      const blob =
        type === "pdf"
          ? await api.medicalReports.exportPdf(reportId)
          : await api.medicalReports.exportDocx(reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zprava-${reportDate}-${reportId}.${type}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Stažení selhalo");
    }
  };

  if (!appointment) return <p className="text-gray-600">Načítám…</p>;

  const isUnassigned = !appointment.employeeId;
  const clientName = client?.name ?? appointment.clientId;

  return (
    <div className="space-y-6">
      <Link href="/employee/calendar" className="text-sm text-primary-600 hover:underline">
        ← Kalendář
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">
        Termín – {format(new Date(appointment.startAt), "datetime")}
      </h1>

      {isUnassigned && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
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

      {/* Appointment basics */}
      <div className="card max-w-lg space-y-2 p-4">
        <p><strong>Začátek:</strong> {format(new Date(appointment.startAt), "datetime")}</p>
        <p><strong>Konec:</strong> {format(new Date(appointment.endAt ?? appointment.startAt), "datetime")}</p>
        <p><strong>Stav:</strong> {appointment.status}</p>
      </div>

      {/* Client card: Health Record, Medical Reports, last visit */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Klient – přehled</h2>
        <div className="mb-4 flex flex-wrap gap-3">
          <Link
            href={`/employee/clients/${appointment.clientId}/health-record`}
            className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100"
          >
            Zdravotní záznam
          </Link>
          <Link
            href={`/employee/clients/${appointment.clientId}/medical-reports`}
            className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100"
          >
            Lékařské zprávy
          </Link>
          <Link
            href={`/employee/clients/${appointment.clientId}/reports`}
            className="rounded border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Nahrané soubory
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Jméno klienta</p>
            <p className="mt-0.5 font-medium text-gray-900">{clientName}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Poslední návštěva</p>
            <p className="mt-0.5 text-gray-900">
              {lastVisit
                ? format(new Date(lastVisit.endAt ?? lastVisit.startAt), "date")
                : "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Diagnóza (zdravotní záznam)</p>
            <p className="mt-0.5 text-gray-900">{client?.diagnosis ? client.diagnosis : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Datum narození dítěte</p>
            <p className="mt-0.5 text-gray-900">{client?.childDateOfBirth ?? "—"}</p>
          </div>
        </div>
        {medicalReports.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Lékařské zprávy (nejnovější)
            </p>
            <ul className="space-y-1">
              {medicalReports.slice(0, 5).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{format(new Date(r.reportDate), "date")}</span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="text-primary-600 hover:underline"
                      onClick={() => downloadReport(r.id, r.reportDate, "pdf")}
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      className="text-primary-600 hover:underline"
                      onClick={() => downloadReport(r.id, r.reportDate, "docx")}
                    >
                      DOCX
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

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
    </div>
  );
}
