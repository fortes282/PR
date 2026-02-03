"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DataTable } from "@/components/tables/DataTable";
import type { WaitingListEntry } from "@/lib/contracts/waitlist";
import type { WaitlistSuggestion } from "@/lib/contracts/waitlist";

export default function ReceptionWaitlistPage(): React.ReactElement {
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [suggestions, setSuggestions] = useState<WaitlistSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const slotStart = new Date();
  const slotEnd = new Date(Date.now() + 60 * 60 * 1000);

  useEffect(() => {
    Promise.all([
      api.waitlist.list().then(setEntries),
      api.waitlist.suggestions({
        slotStart: slotStart.toISOString(),
        slotEnd: slotEnd.toISOString(),
      }).then(setSuggestions),
    ]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- slot times are stable for mount
  }, []);

  const handleNotify = async (entryId: string): Promise<void> => {
    try {
      await api.waitlist.notify(entryId);
      alert("Oznámení odesláno.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Chyba");
    }
  };

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Čekací list</h1>

      <section>
        <h2 className="font-medium text-gray-700">Doporučení pro volný slot</h2>
        <p className="text-sm text-gray-500">
          Slot: {slotStart.toLocaleTimeString("cs-CZ")} – {slotEnd.toLocaleTimeString("cs-CZ")}
        </p>
        <ul className="mt-2 divide-y divide-gray-200 rounded border border-gray-200 bg-white">
          {suggestions.length === 0 ? (
            <li className="px-4 py-8 text-center text-gray-500">Žádná doporučení</li>
          ) : (
            suggestions.map((s) => (
              <li key={s.entry.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-medium">Klient {s.entry.clientId}</span>
                  <span className="ml-2 text-sm text-gray-500">Skóre: {s.score}</span>
                  {s.scoreReasons.length > 0 && (
                    <p className="text-xs text-gray-500">{s.scoreReasons.join(", ")}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => handleNotify(s.entry.id)}
                >
                  Poslat nabídku
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Všichni na čekacím listu</h2>
        <DataTable<WaitingListEntry>
          columns={[
            { key: "clientId", header: "Klient" },
            { key: "serviceId", header: "Služba" },
            { key: "priority", header: "Priorita" },
            {
              key: "id",
              header: "Akce",
              render: (r) => (
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => handleNotify(r.id)}
                >
                  Poslat nabídku
                </button>
              ),
            },
          ]}
          data={entries}
          keyExtractor={(r) => r.id}
        />
      </section>
    </div>
  );
}
