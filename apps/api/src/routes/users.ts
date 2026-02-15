import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomBytes } from "node:crypto";
import { UserListParamsSchema, UserUpdateSchema } from "@pristav/shared/users";
import { InviteUserBodySchema } from "@pristav/shared/auth";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { persistUser, persistPassword } from "../db/persist.js";
import { hashPassword } from "../lib/password.js";
import { nextId } from "../lib/id.js";
import { getSmtpTransport } from "../lib/email.js";

export default async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.get("/users", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parse = UserListParamsSchema.safeParse(request.query);
    const params = parse.success ? parse.data : {};
    let list = Array.from(store.users.values());
    if (params.role) list = list.filter((u) => u.role === params.role);
    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s)
      );
    }
    const total = list.length;
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const start = (page - 1) * limit;
    const users = list.slice(start, start + limit);
    reply.send({ users, total });
  });

  app.get("/users/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = store.users.get(request.params.id);
    if (!user) {
      reply.status(404).send({ code: "NOT_FOUND", message: "User not found" });
      return;
    }
    reply.send(user);
  });

  app.put("/users/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
    const user = store.users.get(request.params.id);
    if (!user) {
      reply.status(404).send({ code: "NOT_FOUND", message: "User not found" });
      return;
    }
    const parse = UserUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const updated = { ...user, ...parse.data };
    persistUser(store, updated);
    reply.send(updated);
  });

  app.post("/users/invite", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    if (request.user?.role !== "ADMIN") {
      reply.status(403).send({ code: "FORBIDDEN", message: "Pouze administrátor může pozvat uživatele." });
      return;
    }
    const parse = InviteUserBodySchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: parse.error.flatten().fieldErrors.role?.[0] ?? "Neplatná data",
        details: parse.error.flatten(),
      });
      return;
    }
    const { email, role } = parse.data;
    const normalizedEmail = email.trim().toLowerCase();
    const existing = Array.from(store.users.values()).find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      reply.status(409).send({ code: "EMAIL_TAKEN", message: "Uživatel s tímto e-mailem již existuje." });
      return;
    }
    const oneTimePassword = randomBytes(8).toString("base64url").slice(0, 12);
    const id = nextId("u");
    const now = new Date().toISOString();
    const nameFromEmail = normalizedEmail.split("@")[0];
    const user = {
      id,
      email: normalizedEmail,
      name: nameFromEmail,
      role,
      active: true,
      createdAt: now,
      mustChangePassword: true as const,
    };
    store.users.set(id, user);
    const passwordHash = hashPassword(oneTimePassword);
    store.passwords.set(id, passwordHash);
    persistUser(store, user);
    persistPassword(store, id, passwordHash);

    const transport = getSmtpTransport();
    const fromEnv = process.env.SMTP_USER?.trim();
    const fromSettings = store.settings.notificationEmailSender;
    const effectiveEmail = fromEnv || fromSettings?.email?.trim();
    if (transport && effectiveEmail) {
      const effectiveName = fromSettings?.name?.trim();
      const roleLabel = role === "RECEPTION" ? "Recepce" : role === "EMPLOYEE" ? "Terapeut" : role;
      try {
        await transport.sendMail({
          from: effectiveName ? { name: effectiveName, address: effectiveEmail } : effectiveEmail,
          to: normalizedEmail,
          subject: "Přístav radosti – přihlašovací údaje",
          text: `Dobrý den,\n\nbyl vám vytvořen účet s rolí ${roleLabel}.\n\nE-mail: ${normalizedEmail}\nJednorázové heslo: ${oneTimePassword}\n\nPo prvním přihlášení budete vyzváni ke změně hesla.\n\nPřihlášení: použijte e-mail a výše uvedené heslo na přihlašovací stránce.\n\nS pozdravem,\nPřístav radosti`,
        });
      } catch (err) {
        request.log.error(err, "Invite email send failed");
        reply.status(502).send({
          code: "EMAIL_SEND_FAILED",
          message: "Uživatel byl vytvořen, ale odeslání e-mailu s heslem selhalo. Heslo si poznamenejte: " + oneTimePassword,
        });
        return;
      }
    }

    reply.send({ user: { id, email: normalizedEmail, name: nameFromEmail, role }, message: "Uživatel vytvořen, e-mail s heslem odeslán." });
  });
}
