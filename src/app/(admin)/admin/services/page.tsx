"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import { formatCzk } from "@/lib/utils/money";
import { DataTable } from "@/components/tables/DataTable";
import { Modal } from "@/components/modals/Modal";
import type { Service, ServiceCreate } from "@/lib/contracts/services";

const SERVICE_TYPES = [
  { value: "INDIVIDUAL", label: "Individuální" },
  { value: "GROUP", label: "Skupinová" },
  { value: "ASSESSMENT", label: "Vyšetření" },
  { value: "OTHER", label: "Jiné" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individuální",
  GROUP: "Skupinová",
  ASSESSMENT: "Vyšetření",
  OTHER: "Jiné",
};

type FormData = {
  name: string;
  type: string;
  durationMinutes: number;
  priceCzk: number;
  active: boolean;
};

const emptyForm: FormData = {
  name: "",
  type: "INDIVIDUAL",
  durationMinutes: 50,
  priceCzk: 800,
  active: true,
};

export default function AdminServicesPage(): React.ReactElement {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = (): void => {
    api.services.list().then(setServices).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = (): void => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s: Service): void => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      type: s.type,
      durationMinutes: s.durationMinutes,
      priceCzk: s.priceCzk,
      active: s.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("Vyplňte název služby.", "error");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.services.update(editingId, {
          name: form.name.trim(),
          type: form.type as ServiceCreate["type"],
          durationMinutes: form.durationMinutes,
          priceCzk: form.priceCzk,
          active: form.active,
        });
        toast("Služba byla upravena.", "success");
      } else {
        await api.services.create({
          name: form.name.trim(),
          type: form.type as ServiceCreate["type"],
          durationMinutes: form.durationMinutes,
          priceCzk: form.priceCzk,
          active: form.active,
        });
        toast("Služba byla vytvořena.", "success");
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
        <h1 className="text-2xl font-bold text-gray-900">Služby</h1>
        <button type="button" className="btn-primary" onClick={openCreate}>
          Přidat službu
        </button>
      </div>
      <DataTable<Service>
        columns={[
          { key: "name", header: "Název" },
          { key: "type", header: "Typ", render: (r) => TYPE_LABELS[r.type] ?? r.type },
          { key: "durationMinutes", header: "Délka (min)" },
          { key: "priceCzk", header: "Cena", render: (r) => formatCzk(r.priceCzk) },
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
        data={services}
        keyExtractor={(r) => r.id}
      />

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId ? "Upravit službu" : "Nová služba"}
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
              {SERVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Délka (min)</span>
              <input
                type="number"
                min={1}
                className="input mt-1 w-full"
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: parseInt(e.target.value, 10) || 1 }))}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Cena (Kč)</span>
              <input
                type="number"
                min={0}
                className="input mt-1 w-full"
                value={form.priceCzk}
                onChange={(e) => setForm((f) => ({ ...f, priceCzk: parseInt(e.target.value, 10) || 0 }))}
              />
            </label>
          </div>
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
