import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PushSubscribeBodySchema } from "@pristav/shared/notifications";
import type { PushSubscription } from "@pristav/shared/notifications";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";
import { persistPushSubscription, deletePushSubscription } from "../db/persist.js";
import { getVapidPublicKey, isPushConfigured, sendPush } from "../lib/push.js";

export default async function pushRoutes(app: FastifyInstance): Promise<void> {
  app.get("/push-config", async (_request: FastifyRequest, reply: FastifyReply) => {
    const fromSettings = store.settings.pushNotificationConfig?.vapidPublicKey;
    const vapidPublicKey = getVapidPublicKey(fromSettings);
    reply.send({ vapidPublicKey });
  });

  app.post(
    "/push-subscriptions",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const parse = PushSubscribeBodySchema.safeParse(request.body);
      if (!parse.success) {
        reply.status(400).send({
          code: "VALIDATION_ERROR",
          message: "Invalid body",
          details: parse.error.flatten(),
        });
        return;
      }
      const body = parse.data;
      const existing = Array.from(store.pushSubscriptions.values()).find((s) => s.endpoint === body.endpoint);
      const id = existing?.id ?? nextId("push");
      const sub: PushSubscription = {
        id,
        userId,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent,
        createdAt: new Date().toISOString(),
      };
      persistPushSubscription(store, sub);
      reply.status(existing ? 200 : 201).send(sub);
    }
  );

  app.delete(
    "/push-subscriptions",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Body: { endpoint?: string } }>, reply: FastifyReply) => {
      const userId = request.user!.userId;
      const body = (request.body as { endpoint?: string }) ?? {};
      const endpoint = body.endpoint;
      if (!endpoint) {
        reply.status(400).send({ code: "VALIDATION_ERROR", message: "endpoint required" });
        return;
      }
      const sub = store.pushSubscriptions.get(endpoint);
      if (!sub || sub.userId !== userId) {
        reply.status(204).send();
        return;
      }
      deletePushSubscription(store, endpoint);
      reply.status(204).send();
    }
  );

  app.get("/push-subscriptions", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;
    const list = Array.from(store.pushSubscriptions.values()).filter((s) => s.userId === userId);
    reply.send(list);
  });

  app.post(
    "/push-subscriptions/test",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Body: { userId?: string; title?: string; body?: string } }>, reply: FastifyReply) => {
      if (request.user!.role !== "ADMIN") {
        reply.status(403).send({ code: "FORBIDDEN", message: "Pouze administrátor může odeslat testovací push." });
        return;
      }
      if (!isPushConfigured()) {
        reply.status(503).send({
          code: "PUSH_NOT_CONFIGURED",
          message:
            "Nastavte VAPID_PUBLIC_KEY a VAPID_PRIVATE_KEY v prostředí serveru (nebo vygenerujte: npx web-push generate-vapid-keys).",
        });
        return;
      }
      const targetUserId = request.body?.userId ?? request.user!.userId;
      const subs = Array.from(store.pushSubscriptions.values()).filter((s) => s.userId === targetUserId);
      if (subs.length === 0) {
        reply.status(400).send({
          code: "NO_SUBSCRIPTION",
          message:
            "Uživatel nemá žádné push odběry. Klient musí v Nastavení povolit push notifikace a uložit.",
        });
        return;
      }
      const title = request.body?.title ?? "Test Přístav radosti";
      const body = request.body?.body ?? "Toto je testovací push notifikace.";
      let sent = 0;
      const errors: string[] = [];
      for (const sub of subs) {
        const result = await sendPush(sub, { title, body, url: "/client/dashboard" });
        if (result.ok) sent++;
        else errors.push(result.error);
      }
      reply.send({ sent, total: subs.length, errors: errors.length ? errors : undefined });
    }
  );
}
