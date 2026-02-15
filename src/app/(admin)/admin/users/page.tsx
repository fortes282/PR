"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import { DataTable } from "@/components/tables/DataTable";
import { Modal } from "@/components/modals/Modal";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import type { User } from "@/lib/contracts/users";
import type { Role } from "@/lib/contracts/auth";

type InviteRole = Exclude<Role, "CLIENT">;

const ROLES: Role[] = ["ADMIN", "RECEPTION", "EMPLOYEE", "CLIENT"];
const INVITE_ROLES: InviteRole[] = ["ADMIN", "RECEPTION", "EMPLOYEE"];

export default function AdminUsersPage(): React.ReactElement {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<Role>("CLIENT");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("RECEPTION");
  const [inviteLoading, setInviteLoading] = useState(false);

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
      toast("Role byla uložena.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Chyba", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      await api.users.invite({ email: inviteEmail.trim(), role: inviteRole });
      load();
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("RECEPTION");
      toast("Pozvánka odeslána. Uživateli byl e-mailem zaslán jednorázový přístup; po prvním přihlášení bude vyzván ke změně hesla.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Pozvání selhalo", "error");
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Uživatelé</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
            Pouze administrátor může měnit roli a aktivitu uživatelů. Klikněte na „Upravit roli“ u vybraného uživatele.
        <HelpTooltip
          title="Změna role a aktivity"
          description="Umožňuje nastavit roli (ADMIN, RECEPTION, EMPLOYEE, CLIENT) a zda je uživatel aktivní. Tuto akci může provádět pouze přihlášený administrátor."
        />
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setInviteOpen(true)}
          aria-label="Pozvat uživatele"
        >
          Pozvat uživatele
        </button>
      </div>
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

      {inviteOpen && (
        <Modal
          open={true}
          onClose={() => !inviteLoading && setInviteOpen(false)}
          title="Pozvat uživatele"
        >
          <form onSubmit={handleInvite} className="space-y-4">
            <p className="text-sm text-gray-600">
              Na e-mail bude odesláno jednorázové heslo. Po prvním přihlášení bude uživatel vyzván ke změně hesla.
            </p>
            <label>
              <span className="block text-sm font-medium text-gray-700">E-mail</span>
              <input
                type="email"
                className="input mt-1 w-full"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="email@example.cz"
                aria-label="E-mail pozvaného uživatele"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700">Role</span>
              <select
                className="input mt-1 w-full"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as InviteRole)}
                aria-label="Role"
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r === "RECEPTION" ? "Recepce" : r === "EMPLOYEE" ? "Terapeut" : r}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setInviteOpen(false)}
                disabled={inviteLoading}
              >
                Zrušit
              </button>
              <button type="submit" className="btn-primary" disabled={inviteLoading}>
                {inviteLoading ? "Odesílám…" : "Pozvat a odeslat e-mail"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
