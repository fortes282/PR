import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ServiceCreateSchema, ServiceUpdateSchema } from "@pristav/shared/services";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";

function nextId(): string {
  const ids = Array.from(store.services.keys())
    .filter((id) => id.startsWith("s-"))
    .map((id) => parseInt(id.replace("s-", ""), 10));
  const max = ids.length ? Math.max(...ids) : 0;
  return `s-${max + 1}`;
}

export default async function servicesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/services", { preHandler: [authMiddleware] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.send(Array.from(store.services.values()));
  });

  app.get("/services/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const service = store.services.get(request.params.id);
    if (!service) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Service not found" });
      return;
    }
    reply.send(service);
  });

  app.post("/services", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = ServiceCreateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const id = nextId();
    const service = { ...parse.data, id };
    store.services.set(id, service);
    reply.status(201).send(service);
  });

  app.put("/services/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
    const service = store.services.get(request.params.id);
    if (!service) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Service not found" });
      return;
    }
    const parse = ServiceUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const updated = { ...service, ...parse.data };
    store.services.set(service.id, updated);
    reply.send(updated);
  });
}
