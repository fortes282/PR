import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { RoomCreateSchema, RoomUpdateSchema } from "@pristav/shared/rooms";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";

function nextId(): string {
  const ids = Array.from(store.rooms.keys())
    .filter((id) => id.startsWith("r-"))
    .map((id) => parseInt(id.replace("r-", ""), 10));
  const max = ids.length ? Math.max(...ids) : 0;
  return `r-${max + 1}`;
}

export default async function roomsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/rooms", { preHandler: [authMiddleware] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.send(Array.from(store.rooms.values()));
  });

  app.get("/rooms/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const room = store.rooms.get(request.params.id);
    if (!room) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Room not found" });
      return;
    }
    reply.send(room);
  });

  app.post("/rooms", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = RoomCreateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const id = nextId();
    const room = { ...parse.data, id };
    store.rooms.set(id, room);
    reply.status(201).send(room);
  });

  app.put("/rooms/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
    const room = store.rooms.get(request.params.id);
    if (!room) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Room not found" });
      return;
    }
    const parse = RoomUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const updated = { ...room, ...parse.data };
    store.rooms.set(room.id, updated);
    reply.send(updated);
  });
}
