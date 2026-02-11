"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ClientRecommendation, RecommendationType } from "@/lib/contracts/admin-background";

const TYPE_LABELS: Record<RecommendationType, string> = {
  INACTIVE_CALL: "Dlouho nebyl — zavolat",
  WAITLIST_FOLLOW_UP: "Čekací list — nabídnout termín",
  CANCELLATION_RISK_REMINDER: "Riziko zrušení — připomínka",
  NO_SHOW_FOLLOW_UP: "Nedostavil se — dovolat se",
  REENGAGE_AFTER_REFUND: "Po refundaci — znovu nabídnout",
  UPSELL_GROUP: "Nabídnout skupinovou terapii",
  SLOT_FILL_OFFER: "Volný slot — nabídka z čekacího listu",
  REMINDER_UPCOMING: "Blížící se termín — připomínka",
  REBOOK_AFTER_COMPLETED: "Po návštěvě — nabídnout další termín",
};

export default function AdminBackgroundRecommendationsPage(): React.ReactElement {
  const [list, setList] = useState<ClientRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api.admin
      .getRecommendations()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Chyba načtení"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-600">Načítám…</p>;
  if (error) return <p className="text-red-600" role="alert">{error}</p>;

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-gray-800">Doporučení k akci</h2>
      <p className="mb-4 text-sm text-gray-600">
        Algoritmus doporučuje kroky ke zvýšení vytíženosti terapeutů a tržeb. Seřazeno podle priority.
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 font-medium text-gray-700">Priorita</th>
              <th className="px-4 py-2 font-medium text-gray-700">Klient</th>
              <th className="px-4 py-2 font-medium text-gray-700">Typ</th>
              <th className="px-4 py-2 font-medium text-gray-700">Důvod</th>
              <th className="px-4 py-2 font-medium text-gray-700">Doporučená akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  Žádná doporučení
                </td>
              </tr>
            ) : (
              list.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{r.priority}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/reception/clients?highlight=${r.clientId}`}
                      className="text-primary-600 hover:underline"
                    >
                      {r.clientName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{TYPE_LABELS[r.type] ?? r.type}</td>
                  <td className="px-4 py-2 text-gray-600">{r.reason}</td>
                  <td className="px-4 py-2 text-gray-700">{r.suggestedAction}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
