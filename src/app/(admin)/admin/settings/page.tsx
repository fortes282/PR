"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Settings, InvoiceIssuer } from "@/lib/contracts/settings";

const emptyIssuer: InvoiceIssuer = {
  name: "",
  street: "",
  city: "",
  zip: "",
  country: "CZ",
  ico: "",
  dic: "",
};

export default function AdminSettingsPage(): React.ReactElement {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [freeCancelHours, setFreeCancelHours] = useState(48);
  const [invoiceNumberPrefix, setInvoiceNumberPrefix] = useState("F");
  const [invoiceNumberNext, setInvoiceNumberNext] = useState(1);
  const [invoiceDueDays, setInvoiceDueDays] = useState(14);
  const [invoiceIssuer, setInvoiceIssuer] = useState<InvoiceIssuer>(emptyIssuer);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings.get().then((s) => {
      setSettings(s);
      setFreeCancelHours(s.freeCancelHours);
      setInvoiceNumberPrefix(s.invoiceNumberPrefix ?? "F");
      setInvoiceNumberNext(s.invoiceNumberNext ?? 1);
      setInvoiceDueDays(s.invoiceDueDays ?? 14);
      setInvoiceIssuer(s.invoiceIssuer ? { ...emptyIssuer, ...s.invoiceIssuer } : emptyIssuer);
    });
  }, []);

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.settings.update({
        freeCancelHours,
        invoiceNumberPrefix: invoiceNumberPrefix || undefined,
        invoiceNumberNext,
        invoiceDueDays,
        invoiceIssuer:
          invoiceIssuer.name || invoiceIssuer.street || invoiceIssuer.city || invoiceIssuer.zip
            ? invoiceIssuer
            : undefined,
      });
      const s = await api.settings.get();
      setSettings(s);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Chyba");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <p className="text-gray-600">Načítám…</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Nastavení</h1>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="card max-w-md space-y-4 p-4">
          <h2 className="font-medium text-gray-900">Obecné</h2>
          <p className="text-sm text-gray-600">
            Lhůta bezplatného zrušení (hodin). Dostupnost rezervací řídí aktivace pracovní doby v sekci Recepce.
          </p>
          <label>
            <span className="block text-sm font-medium text-gray-700">Bezplatné zrušení (hodin)</span>
            <input
              type="number"
              min={0}
              className="input mt-1 w-24"
              value={freeCancelHours}
              onChange={(e) => setFreeCancelHours(parseInt(e.target.value, 10))}
            />
          </label>
        </section>

        <section className="card max-w-lg space-y-4 p-4">
          <h2 className="font-medium text-gray-900">Fakturace</h2>
          <p className="text-sm text-gray-600">
            Číslování faktur a výchozí splatnost. Hlavička (vystavovatel) se zobrazí na fakturách.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span className="block text-sm font-medium text-gray-700">Prefix čísla</span>
              <input
                type="text"
                className="input mt-1 w-full"
                value={invoiceNumberPrefix}
                onChange={(e) => setInvoiceNumberPrefix(e.target.value)}
                placeholder="F"
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700">Další číslo</span>
              <input
                type="number"
                min={1}
                className="input mt-1 w-full"
                value={invoiceNumberNext}
                onChange={(e) => setInvoiceNumberNext(parseInt(e.target.value, 10) || 1)}
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-gray-700">Splatnost (dní)</span>
              <input
                type="number"
                min={1}
                className="input mt-1 w-full"
                value={invoiceDueDays}
                onChange={(e) => setInvoiceDueDays(parseInt(e.target.value, 10) || 14)}
              />
            </label>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Vystavovatel (hlavička faktury)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="block text-sm text-gray-600">Název</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.name}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, name: e.target.value }))}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="block text-sm text-gray-600">Ulice, č.p.</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.street}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, street: e.target.value }))}
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600">Město</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.city}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, city: e.target.value }))}
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600">PSČ</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.zip}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, zip: e.target.value }))}
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600">Země</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.country}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, country: e.target.value }))}
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600">IČO</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.ico ?? ""}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, ico: e.target.value || undefined }))}
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600">DIČ</span>
                <input
                  type="text"
                  className="input mt-1 w-full"
                  value={invoiceIssuer.dic ?? ""}
                  onChange={(e) => setInvoiceIssuer((p) => ({ ...p, dic: e.target.value || undefined }))}
                />
              </label>
            </div>
          </div>
        </section>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Ukládám…" : "Uložit vše"}
        </button>
      </form>
    </div>
  );
}
