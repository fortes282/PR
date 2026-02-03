"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { format } from "@/lib/utils/date";
import { FileUpload } from "@/components/forms/FileUpload";
import type { TherapyReportFile } from "@/lib/contracts/reports";

export default function EmployeeClientReportsPage(): React.ReactElement {
  const params = useParams();
  const clientId = params.id as string;
  const session = getSession();
  const [reports, setReports] = useState<TherapyReportFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.reports.list(clientId).then(setReports).finally(() => setLoading(false));
  }, [clientId]);

  const handleUpload = async (file: File): Promise<void> => {
    try {
      await api.reports.upload(clientId, file);
      const list = await api.reports.list(clientId);
      setReports(list);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Nahrání selhalo");
    }
  };

  const handleVisibility = async (id: string, visibleToClient: boolean): Promise<void> => {
    try {
      await api.reports.updateVisibility(id, { visibleToClient });
      const list = await api.reports.list(clientId);
      setReports(list);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Chyba");
    }
  };

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <Link href="/employee/calendar" className="text-sm text-primary-600 hover:underline">
        ← Kalendář
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Zprávy klienta {clientId}</h1>
      <FileUpload onFileSelect={handleUpload} label="Nahrát zprávu (mock)" />
      <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
        {reports.map((r) => (
          <li key={r.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-gray-900">{r.fileName}</span>
            <span className="text-sm text-gray-500">{format(new Date(r.createdAt), "date")}</span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={r.visibleToClient}
                onChange={(e) => handleVisibility(r.id, e.target.checked)}
              />
              Viditelné klientovi
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
