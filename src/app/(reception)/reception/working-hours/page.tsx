"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import { PageSkeleton } from "@/components/PageSkeleton";
import { addMonths, subMonths } from "@/lib/utils/date";
import type { User } from "@/lib/contracts/users";
import type { WorkingHoursSlot, LunchBreak } from "@/lib/contracts/users";

const DAY_NAMES = [
  "Pondělí",
  "Úterý",
  "Středa",
  "Čtvrtek",
  "Pátek",
  "Sobota",
  "Neděle",
];

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

const THERAPIST_BORDER_COLORS = [
  "border-l-blue-500",
  "border-l-amber-500",
  "border-l-emerald-500",
  "border-l-violet-500",
  "border-l-rose-500",
  "border-l-cyan-500",
];

type TherapistEdits = {
  workingHours: WorkingHoursSlot[];
  lunchBreaks: LunchBreak[];
  defaultPricePerSessionCzk: number;
};

function getDefaultSlotsForDay(dayOfWeek: number): WorkingHoursSlot[] {
  if (dayOfWeek >= 6) return []; // weekend empty by default
  return [{ dayOfWeek, start: "08:00", end: "17:00" }];
}

function getDefaultLunch(dayOfWeek: number): LunchBreak | null {
  if (dayOfWeek >= 6) return null;
  return { dayOfWeek, start: "12:00", end: "12:30" };
}

function userToEdits(u: User): TherapistEdits {
  const workingHours = u.workingHours?.length
    ? [...u.workingHours]
    : [1, 2, 3, 4, 5].flatMap((d) => getDefaultSlotsForDay(d));
  const lunchBreaks =
    u.lunchBreaks?.length ?
      [...u.lunchBreaks]
    : [1, 2, 3, 4, 5]
        .map((d) => getDefaultLunch(d))
        .filter((b): b is LunchBreak => b !== null);
  return {
    workingHours,
    lunchBreaks,
    defaultPricePerSessionCzk: u.defaultPricePerSessionCzk ?? 1000,
  };
}

function parseTimeToMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function lunchDurationMinutes(break_: LunchBreak): number {
  const start = parseTimeToMinutes(break_.start);
  const end = parseTimeToMinutes(break_.end);
  return Math.max(0, Math.min(60, end - start));
}

export default function ReceptionWorkingHoursPage(): React.ReactElement {
  const toast = useToast();
  const [therapists, setTherapists] = useState<User[]>([]);
  const [edits, setEdits] = useState<Record<string, TherapistEdits>>({});
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [therapistFilter, setTherapistFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTherapists = useCallback((): void => {
    setLoading(true);
    api.users
      .list({ role: "EMPLOYEE" })
      .then((r) => {
        setTherapists(r.users);
        setEdits(
          Object.fromEntries(
            r.users.map((u) => [u.id, userToEdits(u)])
          )
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTherapists();
  }, [loadTherapists]);

  const filteredTherapists =
    therapistFilter
      ? therapists.filter((t) => t.id === therapistFilter)
      : therapists;

  const setEdit = (userId: string, updater: (prev: TherapistEdits) => TherapistEdits): void => {
    setEdits((prev) => ({
      ...prev,
      [userId]: updater(prev[userId] ?? userToEdits(therapists.find((t) => t.id === userId)!)),
    }));
  };

  const getSlotsForDay = (userId: string, dayOfWeek: number): WorkingHoursSlot[] =>
    (edits[userId]?.workingHours ?? []).filter((s) => s.dayOfWeek === dayOfWeek);

  const getLunchForDay = (userId: string, dayOfWeek: number): LunchBreak | null =>
    (edits[userId]?.lunchBreaks ?? []).find((b) => b.dayOfWeek === dayOfWeek) ?? null;

  const addSlot = (userId: string, dayOfWeek: number): void => {
    setEdit(userId, (e) => ({
      ...e,
      workingHours: [
        ...e.workingHours,
        { dayOfWeek, start: "09:00", end: "17:00" },
      ],
    }));
  };

  const removeSlot = (userId: string, dayOfWeek: number, index: number): void => {
    setEdit(userId, (e) => ({
      ...e,
      workingHours: e.workingHours
        .filter((s) => s.dayOfWeek !== dayOfWeek)
        .concat(
          e.workingHours
            .filter((s) => s.dayOfWeek === dayOfWeek)
            .filter((_, i) => i !== index)
        ),
    }));
  };

  const updateSlot = (
    userId: string,
    dayOfWeek: number,
    index: number,
    field: "start" | "end",
    value: string
  ): void => {
    setEdit(userId, (e) => {
      const daySlots = e.workingHours.filter((s) => s.dayOfWeek === dayOfWeek);
      const rest = e.workingHours.filter(
        (s) => !(s.dayOfWeek === dayOfWeek)
      );
      const updated = [...daySlots];
      updated[index] = { ...updated[index], [field]: value };
      return { ...e, workingHours: [...rest, ...updated] };
    });
  };

  const setLunch = (userId: string, dayOfWeek: number, value: LunchBreak | null): void => {
    setEdit(userId, (e) => {
      const rest = e.lunchBreaks.filter((b) => b.dayOfWeek !== dayOfWeek);
      return {
        ...e,
        lunchBreaks: value ? [...rest, value] : rest,
      };
    });
  };

  const copyDayToWeek = (userId: string, sourceDayOfWeek: number): void => {
    const slots = getSlotsForDay(userId, sourceDayOfWeek);
    const lunch = getLunchForDay(userId, sourceDayOfWeek);
    setEdit(userId, (e) => {
      const newSlots = [1, 2, 3, 4, 5, 6, 7].flatMap((d) =>
        d === sourceDayOfWeek
          ? slots
          : slots.map((s) => ({ ...s, dayOfWeek: d }))
      );
      const newLunch =
        lunch
          ? [1, 2, 3, 4, 5, 6, 7].map((d) =>
              d === sourceDayOfWeek ? lunch : { ...lunch, dayOfWeek: d }
            )
          : [];
      return {
        ...e,
        workingHours: newSlots,
        lunchBreaks: newLunch,
      };
    });
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      for (const t of therapists) {
        const e = edits[t.id];
        if (!e) continue;
        await api.users.update(t.id, {
          workingHours: e.workingHours,
          lunchBreaks: e.lunchBreaks,
          defaultPricePerSessionCzk: e.defaultPricePerSessionCzk,
        });
      }
      loadTherapists();
      toast("Pracovní doba byla uložena.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Uložení selhalo", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton lines={6} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Nastavení pracovních hodin terapeutů pro rezervace klientů
      </h1>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {MONTH_NAMES[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
          </span>
          <button
            type="button"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
            onClick={() => setSelectedMonth((m) => subMonths(m, 1))}
            aria-label="Předchozí měsíc"
          >
            ←
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
            onClick={() => setSelectedMonth(new Date())}
            aria-label="Dnes"
          >
            Dnes
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
            onClick={() => setSelectedMonth((m) => addMonths(m, 1))}
            aria-label="Další měsíc"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="therapist-filter" className="text-sm font-medium text-gray-700">
            Terapeut:
          </label>
          <select
            id="therapist-filter"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm"
            value={therapistFilter}
            onChange={(e) => setTherapistFilter(e.target.value)}
          >
            <option value="">Všichni</option>
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Ukládám…" : "Uložit změny"}
        </button>
      </div>

      <div className="space-y-6">
        {filteredTherapists.map((therapist, idx) => {
          const borderColor =
            THERAPIST_BORDER_COLORS[idx % THERAPIST_BORDER_COLORS.length];
          const e = edits[therapist.id] ?? userToEdits(therapist);
          return (
            <section
              key={therapist.id}
              className={`rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden border-l-4 ${borderColor}`}
            >
              <div className="border-b border-gray-100 bg-slate-50/50 px-5 py-4">
                <div className="flex flex-wrap items-center gap-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {therapist.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">
                      Cena za 60 min (Kč):
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm"
                      value={e.defaultPricePerSessionCzk}
                      onChange={(ev) =>
                        setEdit(therapist.id, (prev) => ({
                          ...prev,
                          defaultPricePerSessionCzk: Number(ev.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
                    onClick={() => copyDayToWeek(therapist.id, 1)}
                  >
                    Zkopírovat týden (z pondělí)
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="w-28 px-4 py-3 text-left font-medium text-gray-700">
                        Den
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        Pracovní doba
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        Obědová pauza (0–60 min)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
                      const daySlots = getSlotsForDay(therapist.id, dayOfWeek);
                      const lunch = getLunchForDay(therapist.id, dayOfWeek);
                      return (
                        <tr
                          key={dayOfWeek}
                          className="border-b border-gray-100 hover:bg-slate-50/30"
                        >
                          <td className="px-4 py-3 font-medium text-gray-700">
                            {DAY_NAMES[dayOfWeek - 1]}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {daySlots.length === 0 ? (
                                <span className="text-gray-400 text-xs">
                                  Nepracuje
                                </span>
                              ) : (
                                daySlots.map((slot, i) => (
                                  <div
                                    key={`${dayOfWeek}-${i}`}
                                    className="flex items-center gap-1"
                                  >
                                    <input
                                      type="time"
                                      className="w-28 rounded border border-gray-300 px-2 py-1 text-xs"
                                      value={slot.start}
                                      onChange={(ev) =>
                                        updateSlot(
                                          therapist.id,
                                          dayOfWeek,
                                          i,
                                          "start",
                                          ev.target.value
                                        )
                                      }
                                    />
                                    <span className="text-gray-400">–</span>
                                    <input
                                      type="time"
                                      className="w-28 rounded border border-gray-300 px-2 py-1 text-xs"
                                      value={slot.end}
                                      onChange={(ev) =>
                                        updateSlot(
                                          therapist.id,
                                          dayOfWeek,
                                          i,
                                          "end",
                                          ev.target.value
                                        )
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="rounded border border-gray-300 bg-white p-1 text-gray-500 hover:bg-gray-100"
                                      onClick={() =>
                                        removeSlot(therapist.id, dayOfWeek, i)
                                      }
                                      aria-label="Odebrat"
                                    >
                                      −
                                    </button>
                                  </div>
                                ))
                              )}
                              <button
                                type="button"
                                className="rounded border border-dashed border-gray-300 bg-white px-2 py-1 text-xs text-gray-500 hover:border-sky-400 hover:text-sky-600"
                                onClick={() => addSlot(therapist.id, dayOfWeek)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={!!lunch}
                                  onChange={(ev) => {
                                    if (ev.target.checked) {
                                      setLunch(therapist.id, dayOfWeek, {
                                        dayOfWeek,
                                        start: "12:00",
                                        end: "12:30",
                                      });
                                    } else {
                                      setLunch(therapist.id, dayOfWeek, null);
                                    }
                                  }}
                                />
                                <span className="text-gray-600">
                                  Obědová pauza
                                </span>
                              </label>
                              {lunch && (
                                <>
                                  <input
                                    type="time"
                                    className="w-24 rounded border border-gray-300 px-2 py-1 text-xs"
                                    value={lunch.start}
                                    onChange={(ev) =>
                                      setLunch(therapist.id, dayOfWeek, {
                                        ...lunch,
                                        start: ev.target.value,
                                      })
                                    }
                                  />
                                  <span className="text-gray-400">–</span>
                                  <input
                                    type="time"
                                    className="w-24 rounded border border-gray-300 px-2 py-1 text-xs"
                                    value={lunch.end}
                                    onChange={(ev) =>
                                      setLunch(therapist.id, dayOfWeek, {
                                        ...lunch,
                                        end: ev.target.value,
                                      })
                                    }
                                  />
                                  <span className="text-gray-400 text-xs">
                                    ({lunchDurationMinutes(lunch)} min)
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {filteredTherapists.length === 0 && (
        <p className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-gray-500 shadow-sm">
          Žádní terapeuti k zobrazení.
        </p>
      )}
    </div>
  );
}
