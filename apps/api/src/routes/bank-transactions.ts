import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { BankTransaction } from "@pristav/shared/bank-transactions";
import { BankTransactionListParamsSchema } from "@pristav/shared/bank-transactions";
import { store } from "../store.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { persistInvoice } from "../db/persist.js";
import { nextId } from "../lib/id.js";

const bankTransactions = new Map<string, BankTransaction>();

function fetchFioTransactions(
  _from: string,
  _to: string
): BankTransaction[] {
  const token = process.env.FIO_API_TOKEN?.trim();
  if (!token) return [];

  // FIO API integration placeholder:
  // Real implementation would call https://www.fio.cz/ib_api/rest/periods/{token}/{from}/{to}/transactions.json
  // For now, return empty — admin sees "Žádný FIO token" message in UI
  return [];
}

function autoMatchTransactions(): number {
  let matched = 0;
  const invoiceByVS = new Map<string, string>();
  for (const inv of store.invoices.values()) {
    if (inv.status === "PAID") continue;
    const vs = inv.number?.replace(/\D/g, "");
    if (vs) invoiceByVS.set(vs, inv.id);
  }

  for (const tx of bankTransactions.values()) {
    if (tx.invoiceId) continue;
    const vs = tx.variableSymbol?.replace(/\D/g, "");
    if (!vs) continue;
    const invoiceId = invoiceByVS.get(vs);
    if (!invoiceId) continue;
    const inv = store.invoices.get(invoiceId);
    if (!inv || inv.status === "PAID") continue;
    if (Math.abs(tx.amountCzk - inv.amountCzk) > 1) continue;

    tx.invoiceId = invoiceId;
    tx.matchedAt = new Date().toISOString();
    const updated = { ...inv, status: "PAID" as const, paidAt: new Date().toISOString() };
    persistInvoice(store, updated);
    matched++;
  }
  return matched;
}

export default async function bankTransactionsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/bank-transactions",
    { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION")] },
    async (request: FastifyRequest<{ Querystring: { from: string; to: string } }>, reply: FastifyReply) => {
      const parse = BankTransactionListParamsSchema.safeParse(request.query);
      if (!parse.success) {
        reply.status(400).send({
          code: "VALIDATION_ERROR",
          message: "Invalid query (from, to required)",
          details: parse.error.flatten(),
        });
        return;
      }
      const { from, to } = parse.data;
      const list = Array.from(bankTransactions.values())
        .filter((t) => t.date >= from && t.date <= to)
        .sort((a, b) => b.date.localeCompare(a.date));
      reply.send(list);
    }
  );

  app.post(
    "/bank-transactions/sync",
    { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION")] },
    async (request: FastifyRequest<{ Body: { from?: string; to?: string } }>, reply: FastifyReply) => {
      const from = request.body?.from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const to = request.body?.to ?? new Date().toISOString().slice(0, 10);

      const fioToken = process.env.FIO_API_TOKEN?.trim();
      if (!fioToken) {
        reply.send({
          imported: 0,
          message: "FIO_API_TOKEN není nastaven. Nastavte token v prostředí serveru pro automatický import transakcí.",
        });
        return;
      }

      const newTx = fetchFioTransactions(from, to);
      let imported = 0;
      for (const tx of newTx) {
        if (!bankTransactions.has(tx.id)) {
          bankTransactions.set(tx.id, tx);
          imported++;
        }
      }

      const autoMatched = autoMatchTransactions();
      reply.send({ imported, autoMatched });
    }
  );

  app.post(
    "/bank-transactions/match",
    { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION")] },
    async (request: FastifyRequest<{ Body: { invoiceId: string; transactionId: string } }>, reply: FastifyReply) => {
      const { invoiceId, transactionId } = request.body ?? {};
      if (!invoiceId || !transactionId) {
        reply.status(400).send({ code: "VALIDATION_ERROR", message: "invoiceId a transactionId jsou povinné." });
        return;
      }
      const inv = store.invoices.get(invoiceId);
      if (!inv) {
        reply.status(404).send({ code: "NOT_FOUND", message: "Faktura nenalezena." });
        return;
      }
      const tx = bankTransactions.get(transactionId);
      if (!tx) {
        reply.status(404).send({ code: "NOT_FOUND", message: "Transakce nenalezena." });
        return;
      }
      if (tx.invoiceId) {
        reply.status(409).send({ code: "CONFLICT", message: "Transakce je již přiřazena k jiné faktuře." });
        return;
      }

      tx.invoiceId = invoiceId;
      tx.matchedAt = new Date().toISOString();
      const updated = { ...inv, status: "PAID" as const, paidAt: new Date().toISOString() };
      persistInvoice(store, updated);
      reply.status(204).send();
    }
  );

  app.get(
    "/bank-transactions/status",
    { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const fioConfigured = !!process.env.FIO_API_TOKEN?.trim();
      reply.send({
        fioConfigured,
        transactionCount: bankTransactions.size,
        message: fioConfigured
          ? "FIO Bank API je nakonfigurováno."
          : "FIO_API_TOKEN není nastaven. Pro automatický import transakcí nastavte token v prostředí serveru.",
      });
    }
  );
}
