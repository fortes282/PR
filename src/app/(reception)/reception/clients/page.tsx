"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DataTable } from "@/components/tables/DataTable";
import type { User } from "@/lib/contracts/users";

export default function ReceptionClientsPage(): React.ReactElement {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.users.list({ role: "CLIENT", search: search || undefined }).then((r) => {
      setUsers(r.users);
    }).finally(() => setLoading(false));
  }, [search]);

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Klienti</h1>
      <input
        type="search"
        placeholder="Hledat jméno / e-mail"
        className="input max-w-xs"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <DataTable<User>
        columns={[
          { key: "name", header: "Jméno" },
          { key: "email", header: "E-mail" },
          {
            key: "id",
            header: "Akce",
            render: (r) => (
              <Link href={`/reception/clients/${r.id}`} className="text-primary-600 hover:underline">
                Detail
              </Link>
            ),
          },
        ]}
        data={users}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}
