"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BehaviorEvaluationRecord } from "@/lib/contracts/admin-background";
import type { User } from "@/lib/contracts/users";

export default function AdminBackgroundPage(): React.ReactElement {
  const [evaluations, setEvaluations] = useState<BehaviorEvaluationRecord[]>([]);
  const [users, setUsers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.admin.getBehaviorEvaluations(),
      api.users.list({}).then((r) => r.users),
    ]).then(([evals, userList]) => {
      setEvaluations(evals);
      const map = new Map<string, string>();
      userList.forEach((u: User) => map.set(u.id, u.name));
      setUsers(map);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-gray-800">Vyhodnocení skóre chování</h2>
      <p className="mb-4 text-sm text-gray-600">
        Přehled všech vyhodnocení algoritmu: co se změnilo, kdy a proč.
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 font-medium text-gray-700">Klient</th>
              <th className="px-4 py-2 font-medium text-gray-700">Kdy</th>
              <th className="px-4 py-2 font-medium text-gray-700">Předchozí skóre</th>
              <th className="px-4 py-2 font-medium text-gray-700">Nové skóre</th>
              <th className="px-4 py-2 font-medium text-gray-700">Důvod</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {evaluations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  Žádná vyhodnocení
                </td>
              </tr>
            ) : (
              evaluations.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {users.get(e.clientId) ?? e.clientId}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(e.evaluatedAt).toLocaleString("cs-CZ")}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {e.previousScores
                      ? Object.entries(e.previousScores)
                          .filter(([k]) => typeof (e.previousScores as Record<string, unknown>)[k] === "number")
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ") || "—"
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {Object.entries(e.newScores)
                      .filter(([, v]) => typeof v === "number")
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{e.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
