"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import { format } from "@/lib/utils/date";
import type { MedicalReport } from "@/lib/contracts";
import type { User } from "@/lib/contracts/users";

export default function EmployeeClientMedicalReportsPage(): React.ReactElement {
  const params = useParams();
  const clientId = params.id as string;
  const toast = useToast();
  const [client, setClient] = useState<User | null>(null);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.users.get(clientId), api.medicalReports.list(clientId)])
      .then(([u, list]) => {
        setClient(u ?? null);
        setReports(list);
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  const downloadPdf = async (r: MedicalReport): Promise<void> => {
    try {
      const blob = await api.medicalReports.exportPdf(r.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zprava-${r.reportDate}-${r.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Stažení selhalo", "error");
    }
  };

  const downloadDocx = async (r: MedicalReport): Promise<void> => {
    try {
      const blob = await api.medicalReports.exportDocx(r.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zprava-${r.reportDate}-${r.id}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Stažení selhalo", "error");
    }
  };

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <Link href="/employee/calendar" className="text-sm text-primary-600 hover:underline">
        ← Kalendář
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">
        Lékařské zprávy {client ? `– ${client.name}` : ""}
      </h1>
      {reports.length === 0 ? (
        <p className="text-gray-500">Žádné lékařské zprávy.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm">
          {reports.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <span className="text-gray-900">
                {format(new Date(r.reportDate), "date")} – {r.clientFullName}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:underline"
                  onClick={() => downloadPdf(r)}
                >
                  Stáhnout PDF
                </button>
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:underline"
                  onClick={() => downloadDocx(r)}
                >
                  Stáhnout DOCX
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
