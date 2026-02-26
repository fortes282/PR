"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import { DataTable } from "@/components/tables/DataTable";
import { Modal } from "@/components/modals/Modal";
import type { Room, RoomCreate } from "@/lib/contracts/rooms";

const ROOM_TYPES = [
  { value: "THERAPY", label: "Terapeutická" },
  { value: "GROUP", label: "Skupinová" },
  { value: "ASSESSMENT", label: "Vyšetřovací" },
  { value: "OTHER", label: "Jiná" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  THERAPY: "Terapeutická",
  GROUP: "Skupinová",
  ASSESSMENT: "Vyšetřovací",
  OTHER: "Jiná",
};

type FormData = {
  name: string;
  type: string;
  active: boolean;
};

const emptyForm: FormData = { name: "", type: "THERAPY", active: true };

export default function AdminRoomsPage(): React.ReactElement {
  const toast = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = (): void => {
    api.rooms.list().then(setRooms).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = (): void => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (r: Room): void => {
    setEditingId(r.id);
    setForm({ name: r.name, type: r.type, active: r.active });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("Vyplňte název místnosti.", "error");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.rooms.update(editingId, {
          name: form.name.trim(),
          type: form.type as RoomCreate["type"],
          active: form.active,
        });
        toast("Místnost byla upravena.", "success");
      } else {
        await api.rooms.create({
          name: form.name.trim(),
          type: form.type as RoomCreate["type"],
          active: form.active,
        });
        toast("Místnost byla vytvořena.", "success");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Chyba", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Místnosti</h1>
        <button type="button" className="btn-primary" onClick={openCreate}>
          Přidat místnost
        </button>
      </div>
      <DataTable<Room>
        columns={[
          { key: "name", header: "Název" },
          { key: "type", header: "Typ", render: (r) => TYPE_LABELS[r.type] ?? r.type },
          { key: "active", header: "Aktivní", render: (r) => (r.active ? "Ano" : "Ne") },
          {
            key: "actions",
            header: "Akce",
            render: (r) => (
              <button
                type="button"
                className="text-sm text-primary-600 hover:underline"
                onClick={() => openEdit(r)}
              >
                Upravit
              </button>
            ),
          },
        ]}
        data={rooms}
        keyExtractor={(r) => r.id}
      />

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId ? "Upravit místnost" : "Nová místnost"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700">Název *</span>
            <input
              type="text"
              className="input mt-1 w-full"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700">Typ</span>
            <select
              className="input mt-1 w-full"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {ROOM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Aktivní</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Zrušit
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Ukládám…" : editingId ? "Uložit" : "Vytvořit"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
