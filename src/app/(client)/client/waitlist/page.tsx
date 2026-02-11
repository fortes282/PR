"use client";

import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
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

  if (loading) return <PageSkeleton lines={4} />;

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 font-display">
        <ListChecks className="h-7 w-7 text-primary-600" aria-hidden />
        Čekací list
      </h1>
      <p className="text-gray-600">Vaše přihlášky na čekací list.</p>
      {entries.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nejste na čekacím listu"
          description="Vaše přihlášky na čekací list se zobrazí zde."
          variant="card"
        />
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {entries.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <span className="font-medium text-gray-900">Služba ID: {e.serviceId}</span>
              {e.notes && <p className="text-sm text-gray-600">{e.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
