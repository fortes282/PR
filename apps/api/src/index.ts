/**
 * Fastify API server. Persistent SQLite store; port 3001.
 */
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { initDb } from "./db/client.js";
import { getDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { loadFromDbIntoStore } from "./db/load.js";
import { persistAll } from "./db/persist.js";
import { users } from "./db/schema.js";
import { store } from "./store.js";
import { seed } from "./seed.js";

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  initDb();
  runMigrations();

  const existingUsers = getDb().select().from(users).all();
  if (existingUsers.length === 0) {
    seed();
    persistAll(store);
    console.log("Database empty: seeded initial data.");
  } else {
    loadFromDbIntoStore(store);
    console.log("Database loaded into memory.");
  }

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

  app.get("/health", async (_request, reply) => {
    try {
      getDb().select().from(users).limit(1).all();
      return reply.send({ ok: true, service: "api", database: "connected" });
    } catch (err) {
      return reply.status(503).send({
        ok: false,
        service: "api",
        database: "error",
        message: err instanceof Error ? err.message : "Database check failed",
      });
    }
  });

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

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
