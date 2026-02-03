"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import type { WaitingListEntry } from "@/lib/contracts/waitlist";

export default function ClientWaitlistPage(): React.ReactElement {
  const session = getSession();
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const clientId = session?.userId ?? "";

  useEffect(() => {
    api.waitlist.list().then((list) => {
      setEntries(list.filter((e) => e.clientId === clientId));
    }).finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Čekací list</h1>
      <p className="text-gray-600">Vaše přihlášky na čekací list.</p>
      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {entries.length === 0 ? (
          <li className="px-4 py-8 text-center text-gray-500">Nejste na čekacím listu</li>
        ) : (
          entries.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <span className="font-medium text-gray-900">Služba ID: {e.serviceId}</span>
              {e.notes && <p className="text-sm text-gray-600">{e.notes}</p>}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
