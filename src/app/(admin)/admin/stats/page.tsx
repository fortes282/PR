"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { OccupancyStat, CancellationStat, ClientTagStat } from "@/lib/contracts/stats";

export default function AdminStatsPage(): React.ReactElement {
  const [occupancy, setOccupancy] = useState<OccupancyStat[]>([]);
  const [cancellations, setCancellations] = useState<CancellationStat[]>([]);
  const [clientTags, setClientTags] = useState<ClientTagStat[]>([]);
  const [loading, setLoading] = useState(true);

  const from = new Date();
  from.setDate(1);
  const to = new Date();
  to.setMonth(to.getMonth() + 1);
  to.setDate(0);

  useEffect(() => {
    const fromStr = from.toISOString();
    const toStr = to.toISOString();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- from/to are stable for mount
  }, []);

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Statistiky</h1>
      <p className="text-gray-600">Základní přehledy (placeholder tabulky).</p>

      <section>
        <h2 className="font-medium text-gray-700">Vytíženost</h2>
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Datum</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Obsazeno</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {occupancy.map((o) => (
                <tr key={o.date}>
                  <td className="px-4 py-2">{o.date}</td>
                  <td className="px-4 py-2">{o.bookedSlots}/{o.totalSlots}</td>
                  <td className="px-4 py-2">{o.occupancyPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Zrušení</h2>
        <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
          {cancellations.map((c) => (
            <li key={c.period} className="flex justify-between px-4 py-2">
              <span>{c.period}</span>
              <span>Počet: {c.count}, s refundací: {c.withRefund}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Štítky klientů</h2>
        <ul className="flex flex-wrap gap-2">
          {clientTags.map((t) => (
            <li key={t.tag} className="rounded bg-gray-100 px-3 py-1 text-sm">
              {t.tag}: {t.count}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
