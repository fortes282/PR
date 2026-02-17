import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { WaitingListEntrySchema } from "@pristav/shared/waitlist";
import type { WaitingListEntry } from "@pristav/shared/waitlist";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";
import { persistWaitlistEntry, persistNotification, deleteWaitlistEntry } from "../db/persist.js";

function canManageEntry(request: FastifyRequest, entry: WaitingListEntry): boolean {
  const user = (request as FastifyRequest & { user?: { userId: string; role: string } }).user;
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "RECEPTION") return true;
  return entry.clientId === user.userId;
}

export default async function waitlistRoutes(app: FastifyInstance): Promise<void> {
  app.get("/waitlist", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as FastifyRequest & { user?: { userId: string; role: string } }).user;
    let list = Array.from(store.waitlist.values()).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    if (user?.role === "CLIENT") {
      list = list.filter((e) => e.clientId === user.userId);
    }
    reply.send(list);
  });

  app.post("/waitlist", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const user = (request as FastifyRequest & { user?: { userId: string; role: string } }).user;
    const parse = WaitingListEntrySchema.omit({ id: true, createdAt: true }).safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const data = parse.data;
    const clientId = user?.role === "CLIENT" ? user.userId : data.clientId;
    const id = nextId("w");
    const entry: WaitingListEntry = { ...data, clientId, id, createdAt: new Date().toISOString() };
    persistWaitlistEntry(store, entry);
    reply.status(201).send(entry);
  });

  app.put("/waitlist/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
    const w = store.waitlist.get(request.params.id);
    if (!w) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      return;
    }
    if (!canManageEntry(request, w)) {
      reply.status(403).send({ code: "FORBIDDEN", message: "Cannot edit this entry" });
      return;
    }
    const body = request.body as Partial<WaitingListEntry>;
    const updated = { ...w, ...body };
    persistWaitlistEntry(store, updated);
    reply.send(updated);
  });

  app.delete("/waitlist/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const w = store.waitlist.get(request.params.id);
    if (!w) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Waitlist entry not found" });
      return;
    }
    if (!canManageEntry(request, w)) {
      reply.status(403).send({ code: "FORBIDDEN", message: "Cannot delete this entry" });
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
