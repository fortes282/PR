"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { formatCzk } from "@/lib/utils/money";
import { format } from "@/lib/utils/date";

export default function ClientDashboardPage() {
  const [nextAppointment, setNextAppointment] = useState<{
    id: string;
    startAt: string;
    serviceId: string;
  } | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const session = getSession();
  const clientId = session?.userId ?? "";

  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      api.appointments.list({ clientId, from: new Date().toISOString(), to: "" }),
      api.credits.get(clientId),
    ])
      .then(([appointments, account]) => {
        const next = appointments
          .filter((a) => a.status !== "CANCELLED" && new Date(a.startAt) > new Date())
          .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
        setNextAppointment(next ?? null);
        setCredits(account.balanceCzk);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Chyba"))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="text-gray-600">Načítám...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Přehled</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h2 className="font-medium text-gray-700">Nejbližší termín</h2>
          {nextAppointment ? (
            <>
              <p className="mt-1 text-lg text-gray-900">
                {format(new Date(nextAppointment.startAt), "datetime")}
              </p>
              <Link
                href={`/client/appointments`}
                className="mt-2 inline-block text-sm text-primary-600 hover:underline"
              >
                Zobrazit termíny →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-gray-500">Žádný nadcházející termín</p>
              <Link href="/client/book" className="btn-primary mt-2 inline-block">
                Rezervovat
              </Link>
            </>
          )}
        </div>
        <div className="card p-4">
          <h2 className="font-medium text-gray-700">Kredity</h2>
          <p className="mt-1 text-lg text-gray-900">{credits != null ? formatCzk(credits) : "—"}</p>
          <Link
            href="/client/credits"
            className="mt-2 inline-block text-sm text-primary-600 hover:underline"
          >
            Historie →
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/client/book" className="btn-primary">
          Rezervovat termín
        </Link>
        <Link href="/client/appointments" className="btn-secondary">
          Moje termíny
        </Link>
        <Link href="/client/reports" className="btn-secondary">
          Zprávy
        </Link>
      </div>
    </section>
  );
}
