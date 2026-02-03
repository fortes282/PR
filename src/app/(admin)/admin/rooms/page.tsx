"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DataTable } from "@/components/tables/DataTable";
import type { Room } from "@/lib/contracts/rooms";

export default function AdminRoomsPage(): React.ReactElement {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.rooms.list().then(setRooms).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Místnosti</h1>
      <DataTable<Room>
        columns={[
          { key: "name", header: "Název" },
          { key: "type", header: "Typ" },
          { key: "active", header: "Aktivní", render: (r) => (r.active ? "Ano" : "Ne") },
        ]}
        data={rooms}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}
