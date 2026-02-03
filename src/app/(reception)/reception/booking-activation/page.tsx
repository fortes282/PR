"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { startOfMonth, addMonths, monthKey } from "@/lib/utils/date";
import type { User } from "@/lib/contracts/users";
import type { BookingActivation } from "@/lib/contracts/booking-activation";

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

const MONTHS_AHEAD = 6;

export default function ReceptionBookingActivationPage(): React.ReactElement {
  const [therapists, setTherapists] = useState<User[]>([]);
  const [activations, setActivations] = useState<BookingActivation[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fromMonth = monthKey(startOfMonth(new Date()));
  const toDate = addMonths(startOfMonth(new Date()), MONTHS_AHEAD);
  const toMonth = monthKey(toDate);

  const load = useCallback((): void => {
    setLoading(true);
    Promise.all([
      api.users.list({ role: "EMPLOYEE" }),
      api.bookingActivations.list({ fromMonth, toMonth }),
    ])
      .then(([usersRes, actRes]) => {
        setTherapists(usersRes.users);
        setActivations(actRes.activations);
      })
      .finally(() => setLoading(false));
  }, [fromMonth, toMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const getActive = (employeeId: string, monthKeyStr: string): boolean =>
    activations.find(
      (a) => a.employeeId === employeeId && a.monthKey === monthKeyStr
    )?.active ?? false;

  const handleToggle = async (
    employeeId: string,
    monthKeyStr: string,
    current: boolean
  ): Promise<void> => {
    const key = `${employeeId}:${monthKeyStr}`;
    setToggling(key);
    try {
      await api.bookingActivations.set({
        employeeId,
        monthKey: monthKeyStr,
        active: !current,
      });
      const actRes = await api.bookingActivations.list({ fromMonth, toMonth });
      setActivations(actRes.activations);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Chyba při ukládání");
    } finally {
      setToggling(null);
    }
  };

  const monthKeys: string[] = [];
  let d = startOfMonth(new Date());
  for (let i = 0; i <= MONTHS_AHEAD; i++) {
    monthKeys.push(monthKey(d));
    d = addMonths(d, 1);
  }

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Aktivace rezervací</h1>
      <p className="text-gray-600">
        Zapněte nebo vypněte možnost self-rezervace pro terapeuty a měsíce. Klienti vidí pouze dny v měsících, které jsou aktivované a mají pracovní dobu.
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-medium text-gray-700">Terapeut</th>
              {monthKeys.map((mk) => {
                const [y, m] = mk.split("-").map(Number);
                const label = `${MONTH_NAMES[m - 1]} ${y}`;
                return (
                  <th
                    key={mk}
                    className="whitespace-nowrap px-3 py-3 font-medium text-gray-700"
                  >
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {therapists.map((t) => (
              <tr key={t.id} className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                {monthKeys.map((mk) => {
                  const active = getActive(t.id, mk);
                  const key = `${t.id}:${mk}`;
                  const isToggling = toggling === key;
                  return (
                    <td key={mk} className="px-3 py-2">
                      <button
                        type="button"
                        disabled={isToggling}
                        aria-pressed={active}
                        aria-label={`${active ? "Vypnout" : "Zapnout"} rezervace pro ${t.name} v ${mk}`}
                        onClick={() => handleToggle(t.id, mk, active)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        } ${isToggling ? "opacity-50" : ""}`}
                      >
                        {isToggling ? "…" : active ? "Zapnuto" : "Vypnuto"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
