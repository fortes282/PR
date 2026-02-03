"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { format } from "@/lib/utils/date";
import type { TherapyReportFile } from "@/lib/contracts/reports";

export default function ClientReportsPage(): React.ReactElement {
  const session = getSession();
  const [reports, setReports] = useState<TherapyReportFile[]>([]);
  const [loading, setLoading] = useState(true);

  const clientId = session?.userId ?? "";

  useEffect(() => {
    if (!clientId) return;
    api.reports.list(clientId).then(setReports).finally(() => setLoading(false));
  }, [clientId]);

  const handleDownload = async (id: string): Promise<void> => {
    try {
      const blob = await api.reports.download(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Stažení selhalo");
    }
  };

  const visibleReports = reports.filter((r) => r.visibleToClient);

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Zprávy / dokumenty</h1>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {visibleReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-base font-medium text-gray-700">
              Zatím nemáte žádné zprávy ani dokumenty
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Zde se zobrazí zprávy a dokumenty od terapeutů, až budou k dispozici.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visibleReports.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/50"
              >
                <div>
                  <span className="font-medium text-gray-900">{r.fileName}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {format(new Date(r.createdAt), "date")}
                  </span>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  onClick={() => handleDownload(r.id)}
                >
                  Stáhnout
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
