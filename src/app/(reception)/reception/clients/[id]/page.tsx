"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatCzk } from "@/lib/utils/money";
import { format } from "@/lib/utils/date";
import type { User } from "@/lib/contracts/users";

export default function ReceptionClientDetailPage(): React.ReactElement {
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<Awaited<ReturnType<typeof api.credits.get>> | null>(null);
  const [transactions, setTransactions] = useState<Awaited<ReturnType<typeof api.credits.getTransactions>>>([]);
  const [appointments, setAppointments] = useState<Awaited<ReturnType<typeof api.appointments.list>>>([]);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({
    firstName: "",
    lastName: "",
    childName: "",
    phone: "",
    street: "",
    city: "",
    zip: "",
    country: "CZ",
  });

  useEffect(() => {
    api.users.get(id).then((u) => {
      if (u) {
        setUser(u);
        setEdit({
          firstName: u.firstName ?? u.name.split(" ")[0] ?? "",
          lastName: u.lastName ?? u.name.split(" ").slice(1).join(" ") ?? "",
          childName: u.childName ?? "",
          phone: u.phone ?? "",
          street: u.billingAddress?.street ?? "",
          city: u.billingAddress?.city ?? "",
          zip: u.billingAddress?.zip ?? "",
          country: u.billingAddress?.country ?? "CZ",
        });
      }
    });
    api.credits.get(id).then(setCredits);
    api.credits.getTransactions(id).then(setTransactions);
    api.appointments.list({ clientId: id }).then(setAppointments);
  }, [id]);

  const handleAdjust = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const amount = parseInt(adjustAmount, 10);
    if (isNaN(amount) || !adjustReason) return;
    try {
      await api.credits.adjust(id, { amountCzk: amount, reason: adjustReason });
      const acc = await api.credits.get(id);
      const txs = await api.credits.getTransactions(id);
      setCredits(acc);
      setTransactions(txs);
      setAdjustAmount("");
      setAdjustReason("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chyba");
    }
  };

  const handleSaveClient = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updated = await api.users.update(id, {
        firstName: edit.firstName || undefined,
        lastName: edit.lastName || undefined,
        childName: edit.childName || undefined,
        phone: edit.phone || undefined,
        billingAddress:
          edit.street || edit.city || edit.zip
            ? { street: edit.street, city: edit.city, zip: edit.zip, country: edit.country }
            : undefined,
      });
      setUser(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-6">
      <Link href="/reception/clients" className="text-sm text-primary-600 hover:underline">
        ← Klienti
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
      <div className="card max-w-lg space-y-2 p-4">
        <p><strong>E-mail:</strong> {user.email}</p>
        <p><strong>Kredity:</strong> {credits ? formatCzk(credits.balanceCzk) : "—"}</p>
      </div>

      <section>
        <h2 className="font-medium text-gray-700">Údaje pro fakturaci (jméno, adresa, telefon)</h2>
        <form onSubmit={handleSaveClient} className="card mt-2 max-w-lg space-y-3 p-4">
          <label className="block">
            <span className="text-sm text-gray-600">Jméno</span>
            <input
              type="text"
              className="input mt-1"
              value={edit.firstName}
              onChange={(e) => setEdit((p) => ({ ...p, firstName: e.target.value }))}
              placeholder="Křestní jméno"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Příjmení</span>
            <input
              type="text"
              className="input mt-1"
              value={edit.lastName}
              onChange={(e) => setEdit((p) => ({ ...p, lastName: e.target.value }))}
              placeholder="Příjmení"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Jméno dítěte (volitelné)</span>
            <input
              type="text"
              className="input mt-1"
              value={edit.childName}
              onChange={(e) => setEdit((p) => ({ ...p, childName: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Telefon</span>
            <input
              type="text"
              className="input mt-1"
              value={edit.phone}
              onChange={(e) => setEdit((p) => ({ ...p, phone: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Ulice a číslo</span>
            <input
              type="text"
              className="input mt-1"
              value={edit.street}
              onChange={(e) => setEdit((p) => ({ ...p, street: e.target.value }))}
            />
          </label>
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="text-sm text-gray-600">Město</span>
              <input
                type="text"
                className="input mt-1 w-full"
                value={edit.city}
                onChange={(e) => setEdit((p) => ({ ...p, city: e.target.value }))}
              />
            </label>
            <label className="w-24">
              <span className="text-sm text-gray-600">PSČ</span>
              <input
                type="text"
                className="input mt-1 w-full"
                value={edit.zip}
                onChange={(e) => setEdit((p) => ({ ...p, zip: e.target.value }))}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-gray-600">Země</span>
            <input
              type="text"
              className="input mt-1 w-24"
              value={edit.country}
              onChange={(e) => setEdit((p) => ({ ...p, country: e.target.value }))}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Ukládám…" : "Uložit údaje"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Upravit kredity</h2>
        <form onSubmit={handleAdjust} className="mt-2 flex flex-wrap items-end gap-2">
          <input
            type="number"
            placeholder="Částka (+/-)"
            className="input w-32"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
          />
          <input
            type="text"
            placeholder="Důvod"
            className="input w-48"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Upravit
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Historie transakcí</h2>
        <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white text-sm">
          {transactions.map((t) => (
            <li key={t.id} className="flex justify-between px-4 py-2">
              <span>{format(new Date(t.createdAt), "date")} {t.reason}</span>
              <span>{formatCzk(t.amountCzk)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium text-gray-700">Rezervace</h2>
        <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white text-sm">
          {appointments.slice(0, 10).map((a) => (
            <li key={a.id} className="flex justify-between px-4 py-2">
              <span>{format(new Date(a.startAt), "datetime")}</span>
              <span>{a.status}</span>
              <Link href={`/reception/appointments/${a.id}`} className="text-primary-600 hover:underline">
                Detail
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
