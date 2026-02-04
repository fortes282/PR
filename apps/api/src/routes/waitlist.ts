import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { WaitingListEntrySchema } from "@pristav/shared/waitlist";
import type { WaitingListEntry } from "@pristav/shared/waitlist";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";
import { persistWaitlistEntry, persistNotification } from "../db/persist.js";

export default async function waitlistRoutes(app: FastifyInstance): Promise<void> {
  app.get("/waitlist", { preHandler: [authMiddleware] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const list = Array.from(store.waitlist.values()).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    reply.send(list);
  });

  app.post("/waitlist", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = WaitingListEntrySchema.omit({ id: true, createdAt: true }).safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const id = nextId("w");
    const entry: WaitingListEntry = { ...parse.data, id, createdAt: new Date().toISOString() };
    persistWaitlistEntry(store, entry);
    reply.status(201).send(entry);
  });

  app.put("/waitlist/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
    const w = store.waitlist.get(request.params.id);
    if (!w) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      return;
    }
    const body = request.body as Partial<WaitingListEntry>;
    const updated = { ...w, ...body };
    persistWaitlistEntry(store, updated);
    reply.send(updated);
  });

  app.get(
    "/waitlist/suggestions",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Querystring: { slotStart?: string; slotEnd?: string; serviceId?: string } }>, reply: FastifyReply) => {
      let entries = Array.from(store.waitlist.values());
      if (request.query.serviceId) entries = entries.filter((e) => e.serviceId === request.query.serviceId);
      const suggestions = entries.map((entry, i) => ({
        entry,
        score: 100 - i * 10,
        scoreReasons: ["Na čekací listě", "Priorita"],
        priorityBucket: i === 0 ? "high" : "normal",
      }));
      reply.send(suggestions);
    }
  );

  app.post("/waitlist/:id/notify", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const entry = store.waitlist.get(request.params.id);
    if (!entry) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      return;
    }
    const n = {
      id: nextId("n"),
      userId: entry.clientId,
      channel: "IN_APP" as const,
      message: "Nabídka volného termínu",
      read: false,
      createdAt: new Date().toISOString(),
    };
    persistNotification(store, n);
    reply.status(204).send();
  });
}
