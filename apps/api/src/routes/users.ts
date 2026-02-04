import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { UserListParamsSchema, UserUpdateSchema } from "@pristav/shared/users";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { persistUser } from "../db/persist.js";

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
}
