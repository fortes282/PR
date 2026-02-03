"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { formatCzk } from "@/lib/utils/money";
import { format } from "@/lib/utils/date";
import { DataTable } from "@/components/tables/DataTable";
import type { CreditTransaction } from "@/lib/contracts/credits";

export default function ClientCreditsPage(): React.ReactElement {
  const session = getSession();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const clientId = session?.userId ?? "";

  useEffect(() => {
    if (!clientId) return;
    Promise.all([api.credits.get(clientId), api.credits.getTransactions(clientId)])
      .then(([acc, txs]) => {
        setBalance(acc.balanceCzk);
        setTransactions(txs);
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Kredity</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Aktuální zůstatek
        </h2>
        <p className="mt-2 text-3xl font-semibold text-gray-900">
          {balance != null ? formatCzk(balance) : "—"}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Kredity jsou spravovány recepcí nebo administrátorem. Klient nemůže kredity doplňovat ani
          upravovat.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-gray-700">Historie transakcí</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <DataTable<CreditTransaction>
            columns={[
              {
                key: "createdAt",
                header: "Datum",
                render: (r) => format(new Date(r.createdAt), "datetime"),
              },
              {
                key: "amountCzk",
                header: "Částka",
                render: (r) => (
                  <span
                    className={
                      r.amountCzk >= 0 ? "font-medium text-emerald-600" : "font-medium text-gray-700"
                    }
                  >
                    {r.amountCzk >= 0 ? "+" : ""}
                    {formatCzk(r.amountCzk)}
                  </span>
                ),
              },
              { key: "reason", header: "Důvod" },
            ]}
            data={transactions}
            keyExtractor={(r) => r.id}
            emptyMessage="Žádné transakce."
          />
        </div>
      </div>
    </div>
  );
}
