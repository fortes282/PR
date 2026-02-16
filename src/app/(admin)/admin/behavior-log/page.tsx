"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { format } from "@/lib/utils/date";
import type { BehaviorEvaluationRecord, SentCommunication } from "@/lib/contracts/admin-background";
import type { User } from "@/lib/contracts/users";

type Tab = "evaluations" | "outreach";

export default function AdminBehaviorLogPage(): React.ReactElement {
  const [tab, setTab] = useState<Tab>("evaluations");
  const [evaluations, setEvaluations] = useState<BehaviorEvaluationRecord[]>([]);
  const [outreach, setOutreach] = useState<SentCommunication[]>([]);
  const [users, setUsers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterClientName, setFilterClientName] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    setError(null);
    Promise.all([
      api.admin.getBehaviorEvaluations(),
      api.admin.getSentCommunications({}),
      api.users.list({}).then((r) => r.users),
    ])
      .then(([evals, comms, userList]) => {
        setEvaluations(evals);
        setOutreach(comms);
        const map = new Map<string, string>();
        (userList as User[]).forEach((u) => map.set(u.id, u.name));
        setUsers(map);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Chyba načtení"))
      .finally(() => setLoading(false));
  }, []);

  const filteredEvaluations = useMemo(() => {
    let list = evaluations;
    if (filterClientName.trim()) {
      const q = filterClientName.trim().toLowerCase();
      list = list.filter((e) => (users.get(e.clientId) ?? e.clientId).toLowerCase().includes(q));
    }
    if (filterFrom) {
      list = list.filter((e) => e.evaluatedAt >= filterFrom);
    }
    if (filterTo) {
      const toEnd = filterTo.includes("T") ? filterTo : `${filterTo}T23:59:59.999Z`;
      list = list.filter((e) => e.evaluatedAt <= toEnd);
    }
    return list.sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt));
  }, [evaluations, users, filterClientName, filterFrom, filterTo]);

  const filteredOutreach = useMemo(() => {
    let list = outreach;
    if (filterClientName.trim()) {
      const q = filterClientName.trim().toLowerCase();
      list = list.filter((e) => e.recipientName.toLowerCase().includes(q));
    }
    if (filterFrom) {
      list = list.filter((e) => e.sentAt >= filterFrom);
    }
    if (filterTo) {
      const toEnd = filterTo.includes("T") ? filterTo : `${filterTo}T23:59:59.999Z`;
      list = list.filter((e) => e.sentAt <= toEnd);
    }
    return list.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }, [outreach, filterClientName, filterFrom, filterTo]);

  if (loading) return <p className="text-gray-600">Načítám…</p>;
  if (error) return <p className="text-red-600" role="alert">{error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Behavior / Log</h1>
      <p className="text-sm text-gray-600">
        Přehled vyhodnocení skóre a oslovení (notifikace z algoritmu). Filtrování podle jména klienta a data.
      </p>

      <div className="flex flex-wrap gap-4">
        <div className="flex rounded border border-gray-200 bg-white">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium ${tab === "evaluations" ? "bg-primary-100 text-primary-800" : "text-gray-600 hover:bg-gray-50"}`}
            onClick={() => setTab("evaluations")}
            aria-pressed={tab === "evaluations"}
          >
            Vyhodnocení
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium ${tab === "outreach" ? "bg-primary-100 text-primary-800" : "text-gray-600 hover:bg-gray-50"}`}
            onClick={() => setTab("outreach")}
            aria-pressed={tab === "outreach"}
          >
            Oslovení
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            className="input w-48"
            placeholder="Jméno klienta"
            value={filterClientName}
            onChange={(e) => setFilterClientName(e.target.value)}
            aria-label="Filtr: jméno klienta"
          />
          <input
            type="date"
            className="input w-40"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            aria-label="Od data"
          />
          <input
            type="date"
            className="input w-40"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            aria-label="Do data"
          />
        </div>
      </div>

      {tab === "evaluations" && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-800">Log vyhodnocení</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-700">Klient</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Kdy</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Trigger</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Nové skóre</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Důvod</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEvaluations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Žádná vyhodnocení (nebo nic nevyhovuje filtrům)
                    </td>
                  </tr>
                ) : (
                  filteredEvaluations.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2 font-medium text-gray-900">{users.get(e.clientId) ?? e.clientId}</td>
                      <td className="px-4 py-2 text-gray-600">{format(new Date(e.evaluatedAt), "datetime")}</td>
                      <td className="px-4 py-2 text-gray-600">{e.triggerEvent ?? "—"}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {Object.entries(e.newScores)
                          .filter(([, v]) => typeof v === "number")
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{e.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "outreach" && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-gray-800">Log oslovení</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-700">Příjemce</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Kdy</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Kanál</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Předmět / zpráva</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOutreach.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      Žádná oslovení (nebo nic nevyhovuje filtrům)
                    </td>
                  </tr>
                ) : (
                  filteredOutreach.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2 font-medium text-gray-900">{c.recipientName}</td>
                      <td className="px-4 py-2 text-gray-600">{format(new Date(c.sentAt), "datetime")}</td>
                      <td className="px-4 py-2 text-gray-600">{c.channel}</td>
                      <td className="px-4 py-2 text-gray-700">
                        {c.subject ? `${c.subject}: ` : ""}
                        {c.messageText.slice(0, 80)}
                        {c.messageText.length > 80 ? "…" : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
