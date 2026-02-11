"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/layout/Toaster";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatCzk } from "@/lib/utils/money";
import type { Invoice } from "@/lib/contracts/invoices";

export default function ReceptionInvoiceEditPage(): React.ReactElement {
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({
    number: "",
    dueDate: "",
    amountCzk: 0,
    firstName: "",
    lastName: "",
    street: "",
    city: "",
    zip: "",
    country: "CZ",
    phone: "",
  });

  useEffect(() => {
    api.invoices.get(id).then((inv) => {
      if (inv) {
        setInvoice(inv);
        setEdit({
          number: inv.number,
          dueDate: inv.dueDate,
          amountCzk: inv.amountCzk,
          firstName: inv.recipient.firstName,
          lastName: inv.recipient.lastName,
          street: inv.recipient.street,
          city: inv.recipient.city,
          zip: inv.recipient.zip,
          country: inv.recipient.country,
          phone: inv.recipient.phone ?? "",
        });
      }
    });
  }, [id]);

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!invoice) return;
    setSaving(true);
    try {
      await api.invoices.update(id, {
        number: edit.number,
        dueDate: edit.dueDate,
        amountCzk: edit.amountCzk,
        recipient: {
          firstName: edit.firstName,
          lastName: edit.lastName,
          street: edit.street,
          city: edit.city,
          zip: edit.zip,
          country: edit.country,
          phone: edit.phone || undefined,
        },
      });
      const inv = await api.invoices.get(id);
      setInvoice(inv ?? null);
      toast("Faktura byla uložena.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Chyba", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!invoice) return <p className="text-gray-600">Načítám…</p>;

  const isOverdue = invoice.status === "SENT" && invoice.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Fakturace", href: "/reception/billing" },
          {
            label: `Faktura ${invoice.number}${isOverdue ? " (po splatnosti)" : ""}`,
            current: true,
          },
        ]}
      />
      <h1 className="text-2xl font-bold text-gray-900">
        Faktura {invoice.number}
        {isOverdue && <span className="ml-2 text-red-600">(po splatnosti)</span>}
      </h1>

      <form onSubmit={handleSave} className="card max-w-lg space-y-4 p-4">
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="block text-sm font-medium text-gray-700">Číslo faktury</span>
            <input
              type="text"
              className="input mt-1 w-full"
              value={edit.number}
              onChange={(e) => setEdit((p) => ({ ...p, number: e.target.value }))}
            />
          </label>
          <label>
            <span className="block text-sm font-medium text-gray-700">Splatnost</span>
            <input
              type="date"
              className="input mt-1 w-full"
              value={edit.dueDate}
              onChange={(e) => setEdit((p) => ({ ...p, dueDate: e.target.value }))}
            />
          </label>
        </div>
        <label>
          <span className="block text-sm font-medium text-gray-700">Částka (Kč)</span>
          <input
            type="number"
            min={0}
            className="input mt-1 w-32"
            value={edit.amountCzk}
            onChange={(e) => setEdit((p) => ({ ...p, amountCzk: parseInt(e.target.value, 10) || 0 }))}
          />
        </label>
        <h2 className="font-medium text-gray-700">Příjemce</h2>
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="block text-sm text-gray-600">Jméno</span>
            <input
              type="text"
              className="input mt-1 w-full"
              value={edit.firstName}
              onChange={(e) => setEdit((p) => ({ ...p, firstName: e.target.value }))}
            />
          </label>
          <label>
            <span className="block text-sm text-gray-600">Příjmení</span>
            <input
              type="text"
              className="input mt-1 w-full"
              value={edit.lastName}
              onChange={(e) => setEdit((p) => ({ ...p, lastName: e.target.value }))}
            />
          </label>
        </div>
        <label>
          <span className="block text-sm text-gray-600">Ulice</span>
          <input
            type="text"
            className="input mt-1 w-full"
            value={edit.street}
            onChange={(e) => setEdit((p) => ({ ...p, street: e.target.value }))}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="block text-sm text-gray-600">Město</span>
            <input
              type="text"
              className="input mt-1 w-full"
              value={edit.city}
              onChange={(e) => setEdit((p) => ({ ...p, city: e.target.value }))}
            />
          </label>
          <label>
            <span className="block text-sm text-gray-600">PSČ</span>
            <input
              type="text"
              className="input mt-1 w-full"
              value={edit.zip}
              onChange={(e) => setEdit((p) => ({ ...p, zip: e.target.value }))}
            />
          </label>
        </div>
        <label>
          <span className="block text-sm text-gray-600">Telefon</span>
          <input
            type="text"
            className="input mt-1 w-full"
            value={edit.phone}
            onChange={(e) => setEdit((p) => ({ ...p, phone: e.target.value }))}
          />
        </label>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Ukládám…" : "Uložit"}
        </button>
      </form>

      <div className="card max-w-lg space-y-2 p-4 text-sm text-gray-600">
        <p>Stav: {invoice.status}</p>
        <p>Vystaveno: {invoice.issueDate}</p>
        <p>Termíny na faktuře: {invoice.appointmentIds.length}</p>
      </div>
    </div>
  );
}
