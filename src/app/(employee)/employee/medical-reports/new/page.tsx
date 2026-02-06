"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { User } from "@/lib/contracts/users";

export default function NewMedicalReportPage(): React.ReactElement {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [currentCondition, setCurrentCondition] = useState("");
  const [plannedTreatment, setPlannedTreatment] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [saving, setSaving] = useState(false);

  const runSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    api.users
      .list({ role: "CLIENT", search: searchQuery.trim(), limit: 20 })
      .then((res) => setSearchResults(res.users))
      .finally(() => setSearching(false));
  }, [searchQuery]);

  useEffect(() => {
    const t = setTimeout(runSearch, 300);
    return () => clearTimeout(t);
  }, [searchQuery, runSearch]);

  const handleSelectClient = (client: User): void => {
    setSelectedClient(client);
    setSearchResults([]);
    setSearchQuery(client.name);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedClient) return;
    setSaving(true);
    try {
      const report = await api.medicalReports.create({
        clientId: selectedClient.id,
        diagnosis: diagnosis.trim() || undefined,
        currentCondition: currentCondition.trim() || undefined,
        plannedTreatment: plannedTreatment.trim() || undefined,
        recommendations: recommendations.trim() || undefined,
      });
      router.push("/employee/calendar?medicalReportCreated=1");
      void report;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Uložení zprávy selhalo");
    } finally {
      setSaving(false);
    }
  };

  const fullName = selectedClient
    ? [selectedClient.firstName ?? "", selectedClient.lastName ?? ""].filter(Boolean).join(" ") || selectedClient.name
    : "";
  const address = selectedClient?.billingAddress
    ? [
        selectedClient.billingAddress.street,
        selectedClient.billingAddress.city,
        selectedClient.billingAddress.zip,
        selectedClient.billingAddress.country,
      ]
      .filter(Boolean)
      .join(", ")
    : "";
  const reportDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/employee/calendar" className="text-sm text-primary-600 hover:underline">
        ← Kalendář
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Nová lékařská zpráva</h1>

      {/* Client search */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <label htmlFor="client-search" className="mb-2 block text-sm font-medium text-gray-700">
          Vyhledat klienta
        </label>
        <input
          id="client-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => selectedClient && setSelectedClient(null)}
          placeholder="Jméno nebo e-mail klienta"
          className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          autoComplete="off"
        />
        {searching && <p className="mt-1 text-sm text-gray-500">Vyhledávám…</p>}
        {searchResults.length > 0 && (
          <ul
            role="listbox"
            className="mt-2 max-h-48 overflow-auto rounded border border-gray-200 bg-white shadow"
            aria-label="Výsledky vyhledávání"
          >
            {searchResults.map((u) => {
              const isSelected = selectedClient?.id === u.id;
              return (
                <li
                  key={u.id}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                onClick={() => handleSelectClient(u)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectClient(u);
                  }
                }}
                className="cursor-pointer px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                <span className="font-medium text-gray-900">{u.name}</span>
                {u.email && <span className="ml-2 text-sm text-gray-500">{u.email}</span>}
              </li>
              );
            })}
          </ul>
        )}
        {searchQuery.trim() && !searching && searchResults.length === 0 && (
          <p className="mt-1 text-sm text-gray-500">Žádný klient nenalezen.</p>
        )}
      </section>

      {/* Report form (when client selected) */}
      {selectedClient && (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Údaje zprávy</h2>

          {/* Prefilled (read-only) */}
          <div className="grid gap-4 sm:grid-cols-1">
            <div>
              <label className="block text-sm font-medium text-gray-500">Jméno klienta</label>
              <p className="mt-0.5 text-gray-900" aria-readonly>{fullName || "—"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Adresa</label>
              <p className="mt-0.5 text-gray-900" aria-readonly>{address || "—"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Jméno dítěte</label>
              <p className="mt-0.5 text-gray-900" aria-readonly>{selectedClient.childName ?? "—"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Datum narození dítěte</label>
              <p className="mt-0.5 text-gray-900" aria-readonly>{selectedClient.childDateOfBirth ?? "—"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Datum zprávy</label>
              <p className="mt-0.5 text-gray-900" aria-readonly>{reportDate}</p>
            </div>
          </div>

          {/* Manual fields */}
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700">
                  Diagnóza
                </label>
                <textarea
                  id="diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="currentCondition" className="block text-sm font-medium text-gray-700">
                  Aktuální stav
                </label>
                <textarea
                  id="currentCondition"
                  value={currentCondition}
                  onChange={(e) => setCurrentCondition(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="plannedTreatment" className="block text-sm font-medium text-gray-700">
                  Plánovaná léčba
                </label>
                <textarea
                  id="plannedTreatment"
                  value={plannedTreatment}
                  onChange={(e) => setPlannedTreatment(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="recommendations" className="block text-sm font-medium text-gray-700">
                  Doporučení
                </label>
                <textarea
                  id="recommendations"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 border-t border-gray-200 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Ukládám…" : "Uložit zprávu"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedClient(null);
                setSearchQuery("");
                setDiagnosis("");
                setCurrentCondition("");
                setPlannedTreatment("");
                setRecommendations("");
              }}
              className="rounded border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Zrušit / vybrat jiného klienta
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
