/**
 * Fastify API server. In-memory store + seed; port 3001.
 */
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { seed } from "./seed.js";

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.setErrorHandler((err: Error & { statusCode?: number; code?: string }, _request, reply) => {
    const status = err.statusCode ?? (err.code === "FST_ERR_VALIDATION" ? 400 : 500);
    reply.status(status).send({
      code: err.code ?? (status === 401 ? "UNAUTHORIZED" : "ERROR"),
      message: err.message ?? "Internal server error",
    });
  });

  app.get("/", async () => ({ ok: true, service: "api" }));

  const registerRoutes = async (load: () => Promise<Record<string, unknown>>) => {
    const m = await load();
    const fn = m.default as (instance: FastifyInstance) => Promise<void>;
    await app.register(async (instance: FastifyInstance) => { await fn(instance); });
  };
  await registerRoutes(() => import("./routes/auth.js"));
  await registerRoutes(() => import("./routes/users.js"));
  await registerRoutes(() => import("./routes/services.js"));
  await registerRoutes(() => import("./routes/rooms.js"));
  await registerRoutes(() => import("./routes/appointments.js"));
  await registerRoutes(() => import("./routes/credits.js"));
  await registerRoutes(() => import("./routes/availability.js"));
  await registerRoutes(() => import("./routes/booking-activations.js"));
  await registerRoutes(() => import("./routes/billing.js"));
  await registerRoutes(() => import("./routes/invoices.js"));
  await registerRoutes(() => import("./routes/bank-transactions.js"));
  await registerRoutes(() => import("./routes/waitlist.js"));
  await registerRoutes(() => import("./routes/reports.js"));
  await registerRoutes(() => import("./routes/notifications.js"));
  await registerRoutes(() => import("./routes/settings.js"));
  await registerRoutes(() => import("./routes/stats.js"));

  seed();

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
