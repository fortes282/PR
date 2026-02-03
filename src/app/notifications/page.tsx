"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth/useSession";
import { format } from "@/lib/utils/date";
import type { Notification } from "@/lib/contracts/notifications";

export default function NotificationsPage(): React.ReactElement {
  const { session, mounted } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted || !session) return;
    api.notifications.list({ limit: 50 }).then(setNotifications).finally(() => setLoading(false));
  }, [session, mounted]);

  const handleRead = async (id: string): Promise<void> => {
    await api.notifications.read(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  if (!mounted || !session) {
    return <p className="text-gray-600">Načítám…</p>;
  }

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Oznámení</h1>
      <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
        {notifications.length === 0 ? (
          <li className="px-4 py-8 text-center text-gray-500">Žádná oznámení</li>
        ) : (
          notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start justify-between px-4 py-3 ${n.read ? "bg-gray-50" : ""}`}
            >
              <div>
                {n.title && <p className="font-medium text-gray-900">{n.title}</p>}
                <p className="text-gray-700">{n.message}</p>
                <p className="text-xs text-gray-500">{format(new Date(n.createdAt), "datetime")}</p>
              </div>
              {!n.read && (
                <button
                  type="button"
                  className="btn-ghost text-sm text-primary-600"
                  onClick={() => handleRead(n.id)}
                >
                  Označit přečtené
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
