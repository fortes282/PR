"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarClock, Wallet, ChevronRight, CalendarPlus, Anchor } from "lucide-react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { formatCzk } from "@/lib/utils/money";
import { format } from "@/lib/utils/date";

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export default function ClientDashboardPage(): React.ReactElement {
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
    let mounted = true;
    Promise.all([
      api.appointments.list({ clientId, from: new Date().toISOString(), to: "" }),
      api.credits.get(clientId),
    ])
      .then(([appointments, account]) => {
        if (!mounted) return;
        const next = appointments
          .filter((a) => a.status !== "CANCELLED" && new Date(a.startAt) > new Date())
          .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
        setNextAppointment(next ?? null);
        setCredits(account.balanceCzk);
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : "Chyba");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [clientId]);

  if (loading) return <p className="text-gray-600">Načítám…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <section className="space-y-6">
      <motion.div
        variants={item}
        initial="hidden"
        animate="visible"
        className="card card-hover-lift relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 to-sky-600 p-6 text-white shadow-sm"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Vítejte v Přístavu radosti</h1>
            <p className="mt-1 text-sm text-sky-100">
              Rychlý přehled vašich termínů a kreditů – vše na jednom místě.
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-inner">
            <Anchor className="h-6 w-6 text-sky-50" aria-hidden />
          </div>
        </div>
      </motion.div>

      <motion.div
        className="grid gap-4 md:grid-cols-2"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={item}
          className="card card-hover card-hover-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-sky-600" aria-hidden />
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Nejbližší termín
            </h2>
          </div>
          {nextAppointment ? (
            <>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {format(new Date(nextAppointment.startAt), "datetime")}
              </p>
              <Link
                href="/client/appointments"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-600 transition-colors hover:text-sky-700"
              >
                Zobrazit termíny
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-gray-500">Žádný nadcházející termín</p>
              <Link
                href="/client/book"
                className="btn btn-primary mt-3 inline-flex items-center gap-2"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Rezervovat termín
              </Link>
            </>
          )}
        </motion.div>

        <motion.div
          variants={item}
          className="card card-hover card-hover-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-sky-600" aria-hidden />
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Kredity
            </h2>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {credits != null ? formatCzk(credits) : "—"}
          </p>
          <Link
            href="/client/credits"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-600 transition-colors hover:text-sky-700"
          >
            Historie
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        variants={item}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.14 }}
        className="card card-hover card-hover-lift rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <Link
          href="/client/book"
          className="btn btn-primary flex w-full items-center justify-center gap-2 rounded-lg py-3 text-base font-medium md:max-w-xs"
        >
          <CalendarPlus className="h-5 w-5" aria-hidden />
          Rezervovat termín
        </Link>
      </motion.div>
    </section>
  );
}
