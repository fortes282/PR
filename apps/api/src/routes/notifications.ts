import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  NotificationSendBodySchema,
  NotificationListParamsSchema,
  NotificationBulkSendBodySchema,
} from "@pristav/shared/notifications";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";
import { persistNotification } from "../db/persist.js";
import { sendSms } from "../lib/sms.js";

export default async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/notifications",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Querystring: { read?: string; limit?: string; appointmentId?: string; blockId?: string } }>, reply: FastifyReply) => {
      const parse = NotificationListParamsSchema.safeParse({
        read: request.query.read === "true" ? true : request.query.read === "false" ? false : undefined,
        limit: request.query.limit ? Number(request.query.limit) : undefined,
        appointmentId: request.query.appointmentId,
        blockId: request.query.blockId,
      });
      const params = parse.success ? parse.data : {};
      let list = Array.from(store.notifications.values());
      if (params.read !== undefined) list = list.filter((n) => n.read === params.read);
      if (params.appointmentId) list = list.filter((n) => n.appointmentId === params.appointmentId);
      if (params.blockId) list = list.filter((n) => n.blockId === params.blockId);
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const limit = params.limit ?? 50;
      reply.send(list.slice(0, limit));
    }
  );

  app.post(
    "/notifications/send-bulk",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const parse = NotificationBulkSendBodySchema.safeParse(request.body);
      if (!parse.success) {
        reply.status(400).send({
          code: "VALIDATION_ERROR",
          message: "Invalid body",
          details: parse.error.flatten(),
        });
        return;
      }
      const body = parse.data;
      let sent = 0;
      for (const clientId of body.clientIds) {
        const user = store.users.get(clientId);
        if (!user) continue;
        if (body.channel === "SMS") {
          const phone = user.phone?.trim();
          if (!phone) continue;
          try {
            await sendSms(store, phone, body.message);
          } catch (err) {
            request.log.warn({ err, clientId, phone }, "Bulk SMS skip (send failed)");
            continue;
          }
        }
        const n = {
          id: nextId("n"),
          userId: clientId,
          channel: body.channel,
          message: body.message,
          title: body.title ?? (body.channel === "EMAIL" ? body.subject : undefined),
          read: false,
          createdAt: new Date().toISOString(),
        };
        store.notifications.set(n.id, n);
        persistNotification(store, n);
        sent += 1;
      }
      reply.send({ sent });
    }
  );

  app.post("/notifications/send", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = NotificationSendBodySchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const n = {
      id: nextId("n"),
      channel: parse.data.channel,
      message: parse.data.message,
      title: parse.data.title,
      read: false,
      createdAt: new Date().toISOString(),
      appointmentId: parse.data.appointmentId,
      blockId: parse.data.blockId,
    };
    persistNotification(store, n);
    reply.status(204).send();
  });

  app.patch("/notifications/:id/read", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const n = store.notifications.get(request.params.id);
    if (n) {
      const updated = { ...n, read: true };
      persistNotification(store, updated);
    }
    reply.status(204).send();
  });
}
