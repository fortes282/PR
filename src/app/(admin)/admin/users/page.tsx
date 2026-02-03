"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DataTable } from "@/components/tables/DataTable";
import type { User } from "@/lib/contracts/users";

export default function AdminUsersPage(): React.ReactElement {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.users.list({}).then((r) => {
      setUsers(r.users);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Uživatelé</h1>
      <DataTable<User>
        columns={[
          { key: "name", header: "Jméno" },
          { key: "email", header: "E-mail" },
          { key: "role", header: "Role" },
          { key: "active", header: "Aktivní", render: (r) => (r.active ? "Ano" : "Ne") },
        ]}
        data={users}
        keyExtractor={(r) => r.id}
      />
    </div>
  );
}
