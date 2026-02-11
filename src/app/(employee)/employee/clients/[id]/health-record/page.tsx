"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import type { User } from "@/lib/contracts/users";

export default function EmployeeClientHealthRecordPage(): React.ReactElement {
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [childDateOfBirth, setChildDateOfBirth] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.users.get(id).then((u) => {
      if (u) {
        setUser(u);
        setDiagnosis(u.diagnosis ?? "");
        setChildDateOfBirth(u.childDateOfBirth ?? "");
      }
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updated = await api.users.update(id, {
        diagnosis: diagnosis.trim() || undefined,
        childDateOfBirth: childDateOfBirth.trim() || undefined,
      });
      setUser(updated);
      toast("Zdravotní záznam byl uložen.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Chyba", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <Link href="/employee/calendar" className="text-sm text-primary-600 hover:underline">
        ← Kalendář
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Zdravotní záznam – {user.name}</h1>
      <p className="text-sm text-gray-600">
        Údaje zde uložené se předvyplní při vytváření nových lékařských zpráv.
      </p>
      <form onSubmit={handleSubmit} className="card max-w-lg space-y-4 p-6">
        <div>
          <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700">
            Diagnóza
          </label>
          <textarea
            id="diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label htmlFor="childDateOfBirth" className="block text-sm font-medium text-gray-700">
            Datum narození dítěte
          </label>
          <input
            id="childDateOfBirth"
            type="date"
            value={childDateOfBirth}
            onChange={(e) => setChildDateOfBirth(e.target.value)}
            className="mt-1 w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Ukládám…" : "Uložit"}
        </button>
      </form>
    </div>
  );
}
