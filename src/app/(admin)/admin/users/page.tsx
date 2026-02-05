"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DataTable } from "@/components/tables/DataTable";
import { Modal } from "@/components/modals/Modal";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import type { User } from "@/lib/contracts/users";
import type { Role } from "@/lib/contracts/auth";

const ROLES: Role[] = ["ADMIN", "RECEPTION", "EMPLOYEE", "CLIENT"];

export default function AdminUsersPage(): React.ReactElement {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<Role>("CLIENT");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    return api.users.list({}).then((r) => setUsers(r.users));
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const openEdit = (u: User): void => {
    setEditUser(u);
    setEditRole(u.role);
    setEditActive(u.active ?? true);
  };

  const handleSaveRole = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    try {
      await api.users.update(editUser.id, { role: editRole, active: editActive });
      load();
      setEditUser(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Uživatelé</h1>
      <p className="flex items-center gap-2 text-sm text-gray-600">
        Pouze administrátor může měnit roli a aktivitu uživatelů. Klikněte na „Upravit roli“ u vybraného uživatele.
        <HelpTooltip
          title="Změna role a aktivity"
          description="Umožňuje nastavit roli (ADMIN, RECEPTION, EMPLOYEE, CLIENT) a zda je uživatel aktivní. Tuto akci může provádět pouze přihlášený administrátor."
        />
      </p>
      <DataTable<User>
        columns={[
          { key: "name", header: "Jméno" },
          { key: "email", header: "E-mail" },
          { key: "role", header: "Role" },
          { key: "active", header: "Aktivní", render: (r) => (r.active ? "Ano" : "Ne") },
          {
            key: "actions",
            header: "Akce",
            render: (r) => (
              <button
                type="button"
                className="btn-ghost text-sm text-primary-600 hover:underline"
                onClick={() => openEdit(r)}
                title="Změnit roli a aktivitu (pouze admin)"
              >
                Upravit roli
              </button>
            ),
          },
        ]}
        data={users}
        keyExtractor={(r) => r.id}
      />

      {editUser && (
        <Modal
          open={true}
          onClose={() => !saving && setEditUser(null)}
          title="Upravit roli a aktivitu"
        >
          <form onSubmit={handleSaveRole} className="space-y-4">
            <p className="text-sm text-gray-600">
              Uživatel: <strong>{editUser.name}</strong> ({editUser.email})
            </p>
            <label>
              <span className="block text-sm font-medium text-gray-700">Role</span>
              <select
                className="input mt-1 w-full"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as Role)}
                aria-label="Role"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="rounded border-gray-300"
                aria-label="Aktivní"
              />
              <span className="text-sm text-gray-700">Aktivní</span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditUser(null)}
                disabled={saving}
              >
                Zrušit
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Ukládám…" : "Uložit"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
