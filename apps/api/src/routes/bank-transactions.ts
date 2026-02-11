import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { BankTransactionListParamsSchema } from "@pristav/shared/bank-transactions";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { persistInvoice } from "../db/persist.js";

export default async function bankTransactionsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/bank-transactions",
    { preHandler: [authMiddleware] },
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
      reply.send([]);
    }
  );

  app.post(
    "/bank-transactions/sync",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Body: { from?: string; to?: string } }>, reply: FastifyReply) => {
      request.body;
      reply.send({ imported: 0 });
    }
  );

  app.post(
    "/bank-transactions/match",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Body: { invoiceId: string; transactionId: string } }>, reply: FastifyReply) => {
      const { invoiceId } = request.body ?? {};
      const inv = invoiceId ? store.invoices.get(invoiceId) : null;
      if (!inv) {
        reply.status(404).send({ code: "NOT_FOUND", message: "Invoice not found" });
        return;
      }
      const updated = { ...inv, status: "PAID" as const, paidAt: new Date().toISOString() };
      persistInvoice(store, updated);
      reply.status(204).send();
    }
  );
}
