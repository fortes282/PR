import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { WaitingListEntrySchema } from "@pristav/shared/waitlist";
import type { WaitingListEntry } from "@pristav/shared/waitlist";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";
import { persistWaitlistEntry, persistNotification, deleteWaitlistEntry } from "../db/persist.js";

function canManageEntry(request: FastifyRequest, entry: WaitingListEntry): boolean {
  if (!request.user) return false;
  if (request.user.role === "ADMIN" || request.user.role === "RECEPTION") return true;
  return entry.clientId === request.user.userId;
}

export default async function waitlistRoutes(app: FastifyInstance): Promise<void> {
  app.get("/waitlist", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    let list = Array.from(store.waitlist.values()).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    if (request.user?.role === "CLIENT") {
      list = list.filter((e) => e.clientId === request.user!.userId);
    }
    reply.send(list);
  });

  app.post("/waitlist", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = WaitingListEntrySchema.omit({ id: true, createdAt: true }).safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Neplatná data.",
        details: parse.error.flatten(),
      });
      return;
    }
    const data = parse.data;
    const clientId = request.user?.role === "CLIENT" ? request.user.userId : data.clientId;
    const id = nextId("w");
    const entry: WaitingListEntry = { ...data, clientId, id, createdAt: new Date().toISOString() };
    persistWaitlistEntry(store, entry);
    reply.status(201).send(entry);
  });

  app.put("/waitlist/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
    const w = store.waitlist.get(request.params.id);
    if (!w) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Záznam na čekacím listu nenalezen." });
      return;
    }
    if (!canManageEntry(request, w)) {
      reply.status(403).send({ code: "FORBIDDEN", message: "Nemáte oprávnění upravovat tento záznam." });
      return;
    }
    const parse = WaitingListEntrySchema.omit({ id: true, createdAt: true }).partial().safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Neplatná data.",
        details: parse.error.flatten(),
      });
      return;
    }
    const updated = { ...w, ...parse.data };
    persistWaitlistEntry(store, updated);
    reply.send(updated);
  });

  app.delete("/waitlist/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const w = store.waitlist.get(request.params.id);
    if (!w) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Záznam na čekacím listu nenalezen." });
      return;
    }
    if (!canManageEntry(request, w)) {
      reply.status(403).send({ code: "FORBIDDEN", message: "Nemáte oprávnění smazat tento záznam." });
      return;
    }
    deleteWaitlistEntry(store, w.id);
    reply.status(204).send();
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
      reply.status(404).send({ code: "NOT_FOUND", message: "Záznam na čekacím listu nenalezen." });
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
