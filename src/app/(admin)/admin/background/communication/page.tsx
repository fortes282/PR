"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { SentCommunication } from "@/lib/contracts/admin-background";

export default function AdminBackgroundCommunicationPage(): React.ReactElement {
  const [list, setList] = useState<SentCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [messageText, setMessageText] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.admin
      .getSentCommunications({
        recipientName: recipientName || undefined,
        from: from || undefined,
        to: to || undefined,
        messageText: messageText || undefined,
      })
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : "Chyba načtení"))
      .finally(() => setLoading(false));
  }, [recipientName, from, to, messageText]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-gray-800">Odeslané e-maily a SMS</h2>
      <p className="mb-4 text-sm text-gray-600">
        Přehled všech odeslaných e-mailů a SMS s filtrováním.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Příjemce</span>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Jméno"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            aria-label="Filtrovat podle jména příjemce"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Od (datum)</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            aria-label="Filtrovat od data"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Do (datum)</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            aria-label="Filtrovat do data"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Text zprávy</span>
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Hledat v textu"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            aria-label="Filtrovat podle textu zprávy"
          />
        </label>
        <button
          type="button"
          onClick={load}
          className="rounded bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          Filtrovat
        </button>
      </div>

      {error && <p className="mb-2 text-red-600" role="alert">{error}</p>}
      {loading ? (
        <p className="text-gray-600">Načítám…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-700">Kanal</th>
                <th className="px-4 py-2 font-medium text-gray-700">Příjemce</th>
                <th className="px-4 py-2 font-medium text-gray-700">Odesláno</th>
                <th className="px-4 py-2 font-medium text-gray-700">Předmět</th>
                <th className="px-4 py-2 font-medium text-gray-700">Zpráva</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Žádné odeslané zprávy
                  </td>
                </tr>
              ) : (
                list.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">{c.channel}</td>
                    <td className="px-4 py-2 text-gray-700">{c.recipientName}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(c.sentAt).toLocaleString("cs-CZ")}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{c.subject ?? "—"}</td>
                    <td className="max-w-xs truncate px-4 py-2 text-gray-600" title={c.messageText}>
                      {c.messageText}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
