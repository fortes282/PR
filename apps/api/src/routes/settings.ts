import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { SettingsUpdateSchema, TestEmailBodySchema } from "@pristav/shared/settings";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { persistSettings } from "../db/persist.js";
import { getSmtpTransport, isSmtpConfigured } from "../lib/email.js";

export default async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/settings", { preHandler: [authMiddleware] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ ...store.settings });
  });

  app.put("/settings", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = SettingsUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const updated = { ...store.settings, ...parse.data };
    persistSettings(store, updated);
    reply.send({ ...store.settings });
  });

  app.post(
    "/settings/test-email",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const user = request.user;
      if (user?.role !== "ADMIN") {
        reply.status(403).send({ code: "FORBIDDEN", message: "Pouze administrátor může odesílat testovací e-mail." });
        return;
      }
      const parse = TestEmailBodySchema.safeParse(request.body);
      if (!parse.success) {
        reply.status(400).send({
          code: "VALIDATION_ERROR",
          message: "Neplatná data",
          details: parse.error.flatten(),
        });
        return;
      }
      const sender = store.settings.notificationEmailSender;
      if (!sender?.email) {
        reply.status(400).send({
          code: "SENDER_NOT_CONFIGURED",
          message: "V Nastavení nejdříve vyplňte e-mail odesílatele (Oznámení – odesílatel e-mailů).",
        });
        return;
      }
      if (!isSmtpConfigured()) {
        reply.status(503).send({
          code: "SMTP_NOT_CONFIGURED",
          message:
            "SMTP není nakonfigurován. Nastavte v prostředí serveru: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (viz .env.example).",
        });
        return;
      }
      const transport = getSmtpTransport();
      if (!transport) {
        reply.status(503).send({ code: "SMTP_ERROR", message: "SMTP transport není k dispozici." });
        return;
      }
      try {
        await transport.sendMail({
          from: sender.name ? { name: sender.name, address: sender.email } : sender.email,
          to: parse.data.to,
          subject: parse.data.subject,
          text: parse.data.text,
        });
        reply.status(204).send();
      } catch (err) {
        request.log.error(err, "Test email send failed");
        reply.status(502).send({
          code: "SEND_FAILED",
          message: err instanceof Error ? err.message : "Odeslání e-mailu selhalo.",
        });
      }
    }
  );
}
