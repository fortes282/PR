import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { RoomCreateSchema, RoomUpdateSchema } from "@pristav/shared/rooms";
import { store } from "../store.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { persistRoom } from "../db/persist.js";
import { nextId } from "../lib/id.js";

export default async function roomsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/rooms", { preHandler: [authMiddleware] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.send(Array.from(store.rooms.values()));
  });

  app.get("/rooms/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const room = store.rooms.get(request.params.id);
    if (!room) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Místnost nenalezena." });
      return;
    }
    reply.send(room);
  });

  app.post("/rooms", { preHandler: [authMiddleware, requireRole("ADMIN")] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = RoomCreateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Neplatná data.",
        details: parse.error.flatten(),
      });
      return;
    }
    const id = nextId("r");
    const room = { ...parse.data, id };
    persistRoom(store, room);
    reply.status(201).send(room);
  });

  app.put("/rooms/:id", { preHandler: [authMiddleware, requireRole("ADMIN")] }, async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
    const room = store.rooms.get(request.params.id);
    if (!room) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Místnost nenalezena." });
      return;
    }
    const parse = RoomUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Neplatná data.",
        details: parse.error.flatten(),
      });
      return;
    }
    const updated = { ...room, ...parse.data };
    persistRoom(store, updated);
    reply.send(updated);
  });
}
