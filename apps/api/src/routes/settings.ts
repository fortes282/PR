import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { SettingsUpdateSchema } from "@pristav/shared/settings";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { persistSettings } from "../db/persist.js";

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
}
