import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ServiceCreateSchema, ServiceUpdateSchema } from "@pristav/shared/services";
import { store } from "../store.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { persistService } from "../db/persist.js";
import { nextId } from "../lib/id.js";

export default async function servicesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/services", { preHandler: [authMiddleware] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.send(Array.from(store.services.values()));
  });

  app.get("/services/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const service = store.services.get(request.params.id);
    if (!service) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Služba nenalezena." });
      return;
    }
    reply.send(service);
  });

  app.post("/services", { preHandler: [authMiddleware, requireRole("ADMIN")] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = ServiceCreateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Neplatná data.",
        details: parse.error.flatten(),
      });
      return;
    }
    const id = nextId("s");
    const service = { ...parse.data, id };
    persistService(store, service);
    reply.status(201).send(service);
  });

  app.put("/services/:id", { preHandler: [authMiddleware, requireRole("ADMIN")] }, async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
    const service = store.services.get(request.params.id);
    if (!service) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Služba nenalezena." });
      return;
    }
    const parse = ServiceUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Neplatná data.",
        details: parse.error.flatten(),
      });
      return;
    }
    const updated = { ...service, ...parse.data };
    persistService(store, updated);
    reply.send(updated);
  });
}
