import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  LoginCredentialsSchema,
  RegisterBodySchema,
  RequestSmsCodeBodySchema,
  VerifySmsCodeBodySchema,
} from "@pristav/shared/auth";
import { store } from "../store.js";
import { signToken, authMiddleware } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { sendSms } from "../lib/sms.js";
import { nextId } from "../lib/id.js";
import { persistUser, persistPassword, persistCreditAccount } from "../db/persist.js";

const SMS_CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const SMS_CODE_LENGTH = 6;

function generateSmsCode(): string {
  let code = "";
  for (let i = 0; i < SMS_CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const parse = LoginCredentialsSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const credentials = parse.data;
    let user: (typeof store.users extends Map<string, infer U> ? U : never) | undefined;
    if (credentials.role) {
      user = Array.from(store.users.values()).find((u) => u.role === credentials.role);
      if (!user) user = Array.from(store.users.values())[0];
    } else if (credentials.email) {
      user = Array.from(store.users.values()).find((u) => u.email === credentials.email);
    }
    if (!user) {
      reply.status(401).send({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      return;
    }
    const storedHash = store.passwords.get(user.id);
    if (storedHash !== undefined && !verifyPassword(credentials.password ?? "", storedHash)) {
      reply.status(401).send({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      return;
    }
    const accessToken = signToken({ userId: user.id, role: user.role }, 3600);
    const expiresIn = 3600;
    reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        active: user.active,
        createdAt: user.createdAt,
        workingHours: user.workingHours,
        lunchBreaks: user.lunchBreaks,
        defaultPricePerSessionCzk: user.defaultPricePerSessionCzk,
        firstName: user.firstName,
        lastName: user.lastName,
        childName: user.childName,
        billingAddress: user.billingAddress,
      },
      accessToken,
      expiresIn,
    });
  });

  app.post("/auth/register", async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = RegisterBodySchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const body = parse.data;
    const existing = Array.from(store.users.values()).find((u) => u.email === body.email);
    if (existing) {
      reply.status(409).send({ code: "EMAIL_TAKEN", message: "E-mail již je registrován." });
      return;
    }
    if (!body.phone?.trim()) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Telefon je povinný. Vyplňte telefon a vyžádejte si SMS kód.",
      });
      return;
    }
    const phone = body.phone.trim();
    if (body.smsCode?.trim()) {
      const stored = store.smsVerificationCodes.get(phone);
      if (!stored || stored.code !== body.smsCode.trim() || Date.now() > stored.expiresAt) {
        reply.status(400).send({
          code: "INVALID_SMS_CODE",
          message: "Neplatný nebo vypršený SMS kód. Vyžádejte si nový kód.",
        });
        return;
      }
      store.smsVerificationCodes.delete(phone);
    } else {
      reply.status(400).send({
        code: "SMS_CODE_REQUIRED",
        message: "Pro registraci je vyžadováno ověření telefonu. Klikněte na „Odeslat SMS kód“ a zadejte kód z SMS.",
      });
      return;
    }
    const id = nextId("u");
    const now = new Date().toISOString();
    const user = {
      id,
      email: body.email,
      name: body.name,
      role: "CLIENT" as const,
      phone: body.phone,
      active: true,
      createdAt: now,
      firstName: body.firstName,
      lastName: body.lastName,
    };
    store.users.set(id, user);
    const passwordHash = hashPassword(body.password);
    store.passwords.set(id, passwordHash);
    persistUser(store, user);
    persistPassword(store, id, passwordHash);
    const account = { clientId: id, balanceCzk: 0, updatedAt: now };
    store.creditAccounts.set(id, account);
    persistCreditAccount(store, account);
    const accessToken = signToken({ userId: id, role: "CLIENT" }, 3600);
    const expiresIn = 3600;
    reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        active: user.active,
        createdAt: user.createdAt,
      },
      accessToken,
      expiresIn,
    });
  });

  app.post("/auth/sms/request", async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = RequestSmsCodeBodySchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Neplatné číslo (min. 9 znaků).",
        details: parse.error.flatten(),
      });
      return;
    }
    const { phone } = parse.data;
    const code = generateSmsCode();
    store.smsVerificationCodes.set(phone, {
      code,
      expiresAt: Date.now() + SMS_CODE_EXPIRY_MS,
    });
    try {
      await sendSms(store, phone, `Váš ověřovací kód pro Přístav radosti: ${code}. Platnost 10 minut.`);
    } catch (err) {
      store.smsVerificationCodes.delete(phone);
      request.log.error(err, "SMS send failed");
      reply.status(502).send({
        code: "SMS_SEND_FAILED",
        message: err instanceof Error ? err.message : "Odeslání SMS se nezdařilo.",
      });
      return;
    }
    reply.send({ expiresInSeconds: Math.floor(SMS_CODE_EXPIRY_MS / 1000) });
  });

  app.post("/auth/sms/verify", async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = VerifySmsCodeBodySchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const stored = store.smsVerificationCodes.get(parse.data.phone);
    const verified =
      stored &&
      stored.code === parse.data.code &&
      Date.now() <= stored.expiresAt;
    if (verified) store.smsVerificationCodes.delete(parse.data.phone);
    reply.send({ verified: !!verified });
  });

  app.get("/auth/me", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = store.users.get(request.user!.userId)!;
    reply.send({ user });
  });
}
