"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { format, startOfDay, addMonths } from "@/lib/utils/date";
import { formatCzk } from "@/lib/utils/money";
import type { User } from "@/lib/contracts/users";
import type { AvailabilitySlot } from "@/lib/contracts/availability";
import type { BookableDay } from "@/lib/contracts/availability";

const THERAPIST_CARD_COLORS = [
  "border-l-sky-500 bg-sky-50/50",
  "border-l-amber-500 bg-amber-50/50",
  "border-l-emerald-500 bg-emerald-50/50",
  "border-l-violet-500 bg-violet-50/50",
  "border-l-rose-500 bg-rose-50/50",
  "border-l-cyan-500 bg-cyan-50/50",
];

const THERAPIST_SLOT_BUTTON_COLORS = [
  "bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200",
  "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
  "bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200",
  "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200",
];

const THERAPIST_RESERVE_BUTTON_COLORS = [
  "bg-sky-600 text-white hover:bg-sky-700",
  "bg-amber-600 text-white hover:bg-amber-700",
  "bg-emerald-600 text-white hover:bg-emerald-700",
  "bg-violet-600 text-white hover:bg-violet-700",
  "bg-rose-600 text-white hover:bg-rose-700",
  "bg-cyan-600 text-white hover:bg-cyan-700",
];

const DAY_LABELS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

/** Small icon encouraging booking when ≤2 slots remain; subtle pulse (respects reduced-motion). */
function FewSlotsIcon(): React.ReactElement {
  return (
    <span
      className="animate-few-slots-pulse inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-700"
      title="Zbývá málo termínů"
      aria-hidden
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
      </svg>
    </span>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ClientBookPage(): React.ReactElement {
  const session = getSession();
  const [bookableDays, setBookableDays] = useState<BookableDay[]>([]);
  const [therapists, setTherapists] = useState<User[]>([]);
  const [services, setServices] = useState<Awaited<ReturnType<typeof api.services.list>>>([]);
  const [rooms, setRooms] = useState<Awaited<ReturnType<typeof api.rooms.list>>>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [availabilityByTherapist, setAvailabilityByTherapist] = useState<
    Record<string, AvailabilitySlot[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState<string | null>(null);
  /** Pending confirmation: slot chosen but not yet confirmed by client. */
  const [pendingBooking, setPendingBooking] = useState<{
    therapistId: string;
    therapistName: string;
    startAt: string;
    endAt: string;
  } | null>(null);
  const [confirmFeedback, setConfirmFeedback] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    const from = startOfDay(new Date());
    const to = addMonths(from, 6);
    Promise.all([
      api.availability.bookableDays({ from: from.toISOString(), to: to.toISOString() }),
      api.users.list({ role: "EMPLOYEE" }),
      api.services.list(),
      api.rooms.list(),
    ])
      .then(([daysRes, t, svc, r]) => {
        setBookableDays(daysRes);
        setTherapists(t.users);
        setServices(svc);
        setRooms(r);
        const first = daysRes[0];
        setSelectedDay(first ? new Date(first.date + "T12:00:00") : startOfDay(new Date()));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDay || therapists.length === 0) {
      setAvailabilityByTherapist({});
      return;
    }
    const from = new Date(selectedDay);
    from.setHours(0, 0, 0, 0);
    const to = new Date(selectedDay);
    to.setHours(23, 59, 59, 999);
    setSlotsLoading(true);
    Promise.all(
      therapists.map((t) =>
        api.availability
          .list({
            employeeId: t.id,
            from: from.toISOString(),
            to: to.toISOString(),
          })
          .then((slots) => ({ id: t.id, slots }))
      )
    )
      .then((results) => {
        setAvailabilityByTherapist(
          Object.fromEntries(results.map((r) => [r.id, r.slots]))
        );
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedDay, therapists]);

  const handleConfirmReserve = async (): Promise<void> => {
    if (!pendingBooking || !session?.userId || services.length === 0 || rooms.length === 0) return;
    const { therapistId, startAt, endAt } = pendingBooking;
    setConfirmFeedback(null);
    setBooking(therapistId);
    try {
      await api.appointments.create({
        clientId: session.userId,
        employeeId: therapistId,
        serviceId: services[0].id,
        roomId: rooms[0].id,
        startAt,
        endAt,
      });
      setConfirmFeedback("success");
      setPendingBooking(null);
      const from = new Date(selectedDay!);
      from.setHours(0, 0, 0, 0);
      const to = new Date(selectedDay!);
      to.setHours(23, 59, 59, 999);
      const updated = await api.availability.list({
        employeeId: therapistId,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      setAvailabilityByTherapist((prev) => ({ ...prev, [therapistId]: updated }));
      setTimeout(() => setConfirmFeedback(null), 1500);
    } catch (e) {
      setConfirmFeedback("error");
      setTimeout(() => setConfirmFeedback(null), 2000);
    } finally {
      setBooking(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64 rounded-lg" />
        <div className="skeleton h-4 w-full max-w-md rounded" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-16 w-[4.5rem] rounded-lg" />
          ))}
        </div>
        <div className="skeleton h-32 w-full rounded-xl" />
      </div>
    );
  }

  const selectedDateStr = selectedDay ? format(selectedDay, "date") : null;

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <CalendarDays className="h-7 w-7 text-sky-600" aria-hidden />
        Rezervace termínu
      </h1>
      <p className="text-sm text-gray-600">
        Vyberte den a čas. Zelené dny mají volné termíny, červené jsou plně obsazené.
      </p>

      <div>
        <h2 className="mb-2 text-sm font-medium text-gray-700">Vyberte den</h2>
        {bookableDays.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Momentálně nejsou k dispozici žádné dny pro rezervaci. Recepce může zapnout rezervace pro vybrané měsíce v sekci Aktivace rezervací.
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap">
            {bookableDays.map((dayInfo) => {
              const dayStr = dayInfo.date;
              const d = new Date(dayStr + "T12:00:00");
              const isSelected = selectedDateStr === dayStr;
              const dayLabel = DAY_LABELS[d.getDay()];
              const hasSlots = dayInfo.availableCount > 0;
              const fewSlots = dayInfo.availableCount > 0 && dayInfo.availableCount <= 2;
              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`flex min-h-[44px] min-w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2.5 text-center text-sm font-medium shadow-sm transition-[box-shadow,background-color,border-color] duration-fast focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 active:scale-[0.98] ${
                    isSelected
                      ? "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-300"
                      : hasSlots
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:shadow-md"
                        : "border-red-300 bg-red-50 text-red-800 hover:bg-red-100 hover:shadow-md"
                  }`}
                >
                  <span className="block text-xs text-gray-500">{dayLabel}</span>
                  <span className="block">{d.getDate()}.{d.getMonth() + 1}</span>
                  {fewSlots && (
                    <span className="mt-0.5 flex items-center justify-center" title="Zbývá málo termínů">
                      <FewSlotsIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedDay && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-gray-700">
            Dostupní terapeuti – {format(selectedDay, "date")}
          </h2>
          {slotsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="skeleton h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="skeleton h-9 w-14 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {therapists.map((therapist, idx) => {
                const slots = availabilityByTherapist[therapist.id] ?? [];
                const colorClass = THERAPIST_CARD_COLORS[idx % THERAPIST_CARD_COLORS.length];
                const slotBtnClass =
                  THERAPIST_SLOT_BUTTON_COLORS[idx % THERAPIST_SLOT_BUTTON_COLORS.length];
                const reserveBtnClass =
                  THERAPIST_RESERVE_BUTTON_COLORS[idx % THERAPIST_RESERVE_BUTTON_COLORS.length];
                const price =
                  therapist.defaultPricePerSessionCzk ?? 1000;
                return (
                  <div
                    key={therapist.id}
                    className={`card card-hover card-hover-lift rounded-2xl border border-gray-200 border-l-4 bg-white p-4 shadow-sm ${colorClass}`}
                  >
                    <div className="flex flex-wrap items-center gap-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-gray-600 shadow-sm"
                        aria-hidden
                      >
                        {getInitials(therapist.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">
                          {therapist.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatCzk(price)} / 60 min
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {slots.length === 0 ? (
                          <span className="text-sm text-gray-500">
                            Žádný volný čas
                          </span>
                        ) : (
                          slots.map((slot) => {
                            const start = new Date(slot.startAt);
                            const startAt = slot.startAt;
                            const endAt = slot.endAt;
                            return (
                              <button
                                key={slot.startAt}
                                type="button"
                                disabled={!!booking}
                                className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-fast hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 ${slotBtnClass}`}
                                onClick={() =>
                                  setPendingBooking({
                                    therapistId: therapist.id,
                                    therapistName: therapist.name,
                                    startAt,
                                    endAt,
                                  })
                                }
                              >
                                {format(start, "time")}
                              </button>
                            );
                          })
                        )}
                        {slots.length > 0 && (
                          <span className="text-xs text-gray-500">
                            (klik = Vybrat a potvrdit)
                          </span>
                        )}
                      </div>
                      {slots.length > 0 && (
                        <button
                          type="button"
                          disabled={!!booking}
                          className={`btn min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium shadow-sm ${reserveBtnClass}`}
                          onClick={() => {
                            const first = slots[0];
                            if (first)
                              setPendingBooking({
                                therapistId: therapist.id,
                                therapistName: therapist.name,
                                startAt: first.startAt,
                                endAt: first.endAt,
                              });
                          }}
                        >
                          {booking === therapist.id ? "Rezervuji…" : "Rezervovat"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="card card-hover card-hover-lift rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <a
          href="/client/book"
          className="btn btn-primary flex w-full items-center justify-center gap-2 rounded-lg py-3 text-base font-medium md:max-w-xs"
        >
          <CalendarDays className="h-5 w-5" aria-hidden />
          Rezervovat termín
        </a>
      </div>

      <AnimatePresence>
        {pendingBooking && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-booking-title"
            initial={false}
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setPendingBooking(null)}
              aria-hidden
            />
            <motion.div
              className={`card relative z-10 w-full max-w-md rounded-t-2xl border-t p-6 shadow-lg max-sm:rounded-t-2xl sm:rounded-2xl ${
                confirmFeedback === "error" ? "animate-error-shake" : ""
              } ${confirmFeedback === "success" ? "animate-success-flash" : ""}`}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
              }}
              exit={{
                opacity: 0,
                y: 24,
                scale: 0.98,
                transition: { duration: 0.2 },
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="confirm-booking-title" className="text-lg font-semibold text-gray-900">
                Potvrdit rezervaci
              </h2>
              <p className="mt-2 text-gray-600">
                Rezervovat termín u <strong>{pendingBooking.therapistName}</strong> dne{" "}
                {selectedDay && format(selectedDay, "date")} v{" "}
                {format(new Date(pendingBooking.startAt), "time")}?
              </p>
              {confirmFeedback === "error" && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  Rezervace selhala. Zkuste to znovu.
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingBooking(null)}
                  className="btn btn-secondary flex-1"
                >
                  Zrušit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReserve}
                  disabled={!!booking}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  {booking ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="spinner" aria-hidden />
                      Rezervuji…
                    </span>
                  ) : (
                    "Potvrdit rezervaci"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
