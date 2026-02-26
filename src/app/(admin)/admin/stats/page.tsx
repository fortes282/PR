"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingDown, Tags } from "lucide-react";
import { api } from "@/lib/api";
import { PageSkeleton } from "@/components/PageSkeleton";
import type { OccupancyStat, CancellationStat, ClientTagStat } from "@/lib/contracts/stats";

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function OccupancyBar({ percent }: { percent: number }): React.ReactElement {
  const color =
    percent >= 80 ? "bg-emerald-500" : percent >= 50 ? "bg-sky-500" : percent >= 20 ? "bg-amber-500" : "bg-gray-300";
  return (
    <div className="flex items-center gap-3">
      <div className="h-5 w-full max-w-[200px] overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-700 tabular-nums">{percent}%</span>
    </div>
  );
}

export default function AdminStatsPage(): React.ReactElement {
  const [occupancy, setOccupancy] = useState<OccupancyStat[]>([]);
  const [cancellations, setCancellations] = useState<CancellationStat[]>([]);
  const [clientTags, setClientTags] = useState<ClientTagStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const from = new Date(selectedYear, selectedMonth, 1);
    const to = new Date(selectedYear, selectedMonth + 1, 0);
    const fromStr = from.toISOString();
    const toStr = to.toISOString();
    setLoading(true);
    Promise.all([
      api.stats.occupancy({ from: fromStr, to: toStr }),
      api.stats.cancellations({ from: fromStr, to: toStr }),
      api.stats.clientTags(),
    ])
      .then(([o, c, t]) => {
        setOccupancy(o);
        setCancellations(c);
        setClientTags(t);
      })
      .finally(() => setLoading(false));
  }, [selectedMonth, selectedYear]);

  const avgOccupancy =
    occupancy.length > 0
      ? Math.round(occupancy.reduce((s, o) => s + o.occupancyPercent, 0) / occupancy.length)
      : 0;

  const totalCancellations = cancellations.reduce((s, c) => s + c.count, 0);
  const totalRefunds = cancellations.reduce((s, c) => s + c.withRefund, 0);

  if (loading) return <PageSkeleton lines={6} />;

  return (
    <div className="space-y-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <BarChart3 className="h-7 w-7 text-sky-600" aria-hidden />
        Statistiky
      </h1>

      <div className="flex flex-wrap items-center gap-4">
        <select
          className="input w-40"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          aria-label="Měsíc"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i}>{name}</option>
          ))}
        </select>
        <select
          className="input w-28"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          aria-label="Rok"
        >
          {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Průměrná vytíženost</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{avgOccupancy}%</p>
          <OccupancyBar percent={avgOccupancy} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Zrušené termíny</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalCancellations}</p>
          <p className="mt-1 text-sm text-gray-500">z toho s refundací: {totalRefunds}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Štítky klientů</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{clientTags.length}</p>
          <p className="mt-1 text-sm text-gray-500">různých kategorií</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <BarChart3 className="h-5 w-5 text-sky-500" aria-hidden />
          Vytíženost po dnech
        </h2>
        {occupancy.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white px-5 py-8 text-center text-gray-500">
            Pro zvolené období nejsou data o vytíženosti.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Datum</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Obsazeno</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Vytíženost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {occupancy.map((o) => (
                  <tr key={o.date} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{o.date}</td>
                    <td className="px-4 py-2.5 text-gray-600">{o.bookedSlots}/{o.totalSlots}</td>
                    <td className="px-4 py-2.5">
                      <OccupancyBar percent={o.occupancyPercent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <TrendingDown className="h-5 w-5 text-amber-500" aria-hidden />
          Zrušení
        </h2>
        {cancellations.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white px-5 py-8 text-center text-gray-500">
            Žádná zrušení v tomto období.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Období</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Počet</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">S refundací</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cancellations.map((c) => (
                  <tr key={c.period} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{c.period}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.count}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.withRefund}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Tags className="h-5 w-5 text-violet-500" aria-hidden />
          Štítky klientů
        </h2>
        {clientTags.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white px-5 py-8 text-center text-gray-500">
            Žádné štítky klientů.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {clientTags.map((t) => (
              <span
                key={t.tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm"
              >
                {t.tag}
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600">
                  {t.count}
                </span>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
