"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { useToast } from "@/components/layout/Toaster";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { format } from "@/lib/utils/date";
import type { TherapyReportFile } from "@/lib/contracts/reports";

export default function ClientReportsPage(): React.ReactElement {
  const session = getSession();
  const toast = useToast();
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
      toast(e instanceof Error ? e.message : "Stažení selhalo", "error");
    }
  };

  const visibleReports = reports.filter((r) => r.visibleToClient);

  if (loading) return <PageSkeleton lines={5} />;

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 font-display">
        <FileText className="h-7 w-7 text-primary-600" aria-hidden />
        Zprávy / dokumenty
      </h1>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {visibleReports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Žádné zprávy ani dokumenty"
            description="Zde se zobrazí zprávy a dokumenty od terapeutů, až budou k dispozici."
            variant="card"
          />
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
