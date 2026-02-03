import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { LoginCredentialsSchema } from "@pristav/shared/auth";
import { store } from "../store.js";
import { signToken, authMiddleware } from "../middleware/auth.js";

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
    let user = undefined;
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

  app.get("/auth/me", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = store.users.get(request.user!.userId)!;
    reply.send({ user });
  });
}
