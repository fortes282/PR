import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { SettingsUpdateSchema, TestEmailBodySchema } from "@pristav/shared/settings";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { persistSettings } from "../db/persist.js";
import { getSmtpTransport, isSmtpConfigured, verifySmtpConnection } from "../lib/email.js";
import { getVapidPublicKey } from "../lib/push.js";

export default async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/settings", { preHandler: [authMiddleware] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const fromEnv = process.env.SMTP_USER?.trim();
    const fromSettings = store.settings.notificationEmailSender;
    const effectiveEmail = fromEnv || fromSettings?.email?.trim();
    const effectiveName = fromSettings?.name?.trim();
    const effectiveNotificationEmailSender =
      effectiveEmail ?
        { email: effectiveEmail, name: effectiveName ?? undefined, fromEnv: Boolean(fromEnv) }
      : undefined;

    const vapidFromEnv = Boolean(process.env.VAPID_PUBLIC_KEY?.trim());
    const effectiveVapidPublicKey = getVapidPublicKey(store.settings.pushNotificationConfig?.vapidPublicKey);
    const effectivePushVapid =
      effectiveVapidPublicKey != null
        ? { vapidPublicKey: effectiveVapidPublicKey, fromEnv: vapidFromEnv }
        : undefined;

    const settingsOut = { ...store.settings };
    if (vapidFromEnv && settingsOut.pushNotificationConfig) {
      const cleaned = { ...settingsOut.pushNotificationConfig, vapidPublicKey: undefined };
      settingsOut.pushNotificationConfig = cleaned;
      if (store.settings.pushNotificationConfig?.vapidPublicKey != null) {
        store.settings.pushNotificationConfig = { ...store.settings.pushNotificationConfig!, vapidPublicKey: undefined };
        persistSettings(store, { ...store.settings });
      }
    }

    reply.send({
      ...settingsOut,
      ...(effectiveNotificationEmailSender ? { effectiveNotificationEmailSender } : {}),
      ...(effectivePushVapid ? { effectivePushVapid } : {}),
    });
  });

  app.get(
    "/settings/email-status",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const fromEnv = process.env.SMTP_USER?.trim();
      const fromSettings = store.settings.notificationEmailSender;
      const effectiveEmail = fromEnv || fromSettings?.email?.trim();
      const effectiveName = fromSettings?.name?.trim();

      if (!effectiveEmail) {
        reply.send({
          ok: false,
          message: "E-mail není dostupný",
          details:
            "Nastavte na serveru SMTP_USER v prostředí, nebo vyplňte e-mail odesílatele v sekci „Oznámení – odesílatel e-mailů“ a uložte nastavení.",
        });
        return;
      }
      if (!isSmtpConfigured()) {
        reply.send({
          ok: false,
          message: "E-mail není dostupný",
          details: "Na serveru chybí SMTP konfigurace. Nastavte v prostředí: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (viz .env.example).",
        });
        return;
      }
      const verify = await verifySmtpConnection();
      if (!verify.ok) {
        reply.send({
          ok: false,
          message: "E-mail není dostupný",
          details: `SMTP spojení selhalo: ${verify.error}`,
        });
        return;
      }
      const senderLabel = effectiveName ? `${effectiveName} <${effectiveEmail}>` : effectiveEmail;
      const sourceHint = fromEnv ? " (e-mail z SMTP_USER v env)" : "";
      reply.send({
        ok: true,
        message: "E-mail je připraven",
        details: `Odesílatel: ${senderLabel}${sourceHint}. SMTP spojení v pořádku.`,
      });
    }
  );

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
    let updated = { ...store.settings, ...parse.data };
    if (process.env.VAPID_PUBLIC_KEY?.trim() && updated.pushNotificationConfig) {
      updated = {
        ...updated,
        pushNotificationConfig: { ...updated.pushNotificationConfig, vapidPublicKey: undefined },
      };
    }
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
      const fromEnv = process.env.SMTP_USER?.trim();
      const fromSettings = store.settings.notificationEmailSender;
      const effectiveEmail = fromEnv || fromSettings?.email?.trim();
      if (!effectiveEmail) {
        reply.status(400).send({
          code: "SENDER_NOT_CONFIGURED",
          message:
            "Nastavte na serveru SMTP_USER v prostředí, nebo vyplňte e-mail odesílatele v sekci „Oznámení – odesílatel e-mailů“.",
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
      const effectiveName = fromSettings?.name?.trim();
      try {
        await transport.sendMail({
          from: effectiveName ? { name: effectiveName, address: effectiveEmail } : effectiveEmail,
          to: parse.data.to,
          subject: parse.data.subject,
          text: parse.data.text,
        });
        request.log.info({ to: parse.data.to }, "Test email sent");
        reply.send({ sent: true, to: parse.data.to });
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
