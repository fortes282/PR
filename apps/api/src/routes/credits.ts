import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { CreditAdjustBodySchema } from "@pristav/shared/credits";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";
import { persistCreditAccount, persistCreditTransaction } from "../db/persist.js";

export default async function creditsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/credits/:clientId", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { clientId: string } }>, reply: FastifyReply) => {
    const acc = store.creditAccounts.get(request.params.clientId);
    if (!acc) {
      reply.send({ clientId: request.params.clientId, balanceCzk: 0, updatedAt: new Date().toISOString() });
      return;
    }
    reply.send(acc);
  });

  app.get("/credits/:clientId/transactions", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { clientId: string } }>, reply: FastifyReply) => {
    const list = Array.from(store.creditTransactions.values())
      .filter((t) => t.clientId === request.params.clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    reply.send(list);
  });

  app.post("/credits/:clientId/adjust", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { clientId: string }; Body: unknown }>, reply: FastifyReply) => {
    const parse = CreditAdjustBodySchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const clientId = request.params.clientId;
    let acc = store.creditAccounts.get(clientId);
    if (!acc) {
      acc = { clientId, balanceCzk: 0, updatedAt: new Date().toISOString() };
      persistCreditAccount(store, acc);
    }
    acc.balanceCzk += parse.data.amountCzk;
    acc.updatedAt = new Date().toISOString();
    persistCreditAccount(store, acc);
    const tx = {
      id: nextId("tx"),
      clientId,
      amountCzk: parse.data.amountCzk,
      reason: parse.data.reason,
      createdAt: new Date().toISOString(),
    };
    persistCreditTransaction(store, tx);
    reply.status(201).send(tx);
  });
}
