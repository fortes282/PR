"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCzk } from "@/lib/utils/money";
import { DataTable } from "@/components/tables/DataTable";
import type { Service } from "@/lib/contracts/services";

export default function AdminServicesPage(): React.ReactElement {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.services.list().then(setServices).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Služby</h1>
      <DataTable<Service>
        columns={[
          { key: "name", header: "Název" },
          { key: "type", header: "Typ" },
          { key: "durationMinutes", header: "Délka (min)" },
          { key: "priceCzk", header: "Cena", render: (r) => formatCzk(r.priceCzk) },
          { key: "active", header: "Aktivní", render: (r) => (r.active ? "Ano" : "Ne") },
        ]}
        data={services}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}
