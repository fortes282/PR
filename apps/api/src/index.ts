/**
 * Fastify API server. Persistent SQLite store; port 3001.
 */
import Fastify from "fastify";
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
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import servicesRoutes from "./routes/services.js";
import roomsRoutes from "./routes/rooms.js";
import appointmentsRoutes from "./routes/appointments.js";
import creditsRoutes from "./routes/credits.js";
import availabilityRoutes from "./routes/availability.js";
import bookingActivationsRoutes from "./routes/booking-activations.js";
import billingRoutes from "./routes/billing.js";
import invoicesRoutes from "./routes/invoices.js";
import bankTransactionsRoutes from "./routes/bank-transactions.js";
import waitlistRoutes from "./routes/waitlist.js";
import reportsRoutes from "./routes/reports.js";
import notificationsRoutes from "./routes/notifications.js";
import settingsRoutes from "./routes/settings.js";
import statsRoutes from "./routes/stats.js";

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

  const corsOrigin = process.env.CORS_ORIGIN;
  const corsOrigins = corsOrigin ? corsOrigin.split(",").map((o) => o.trim()) : undefined;
  await app.register(cors, {
    origin: corsOrigins ?? true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.setErrorHandler((err: Error & { statusCode?: number; code?: string }, _request, reply) => {
    const status = err.statusCode ?? (err.code === "FST_ERR_VALIDATION" ? 400 : 500);
    reply.status(status).send({
      code: err.code ?? (status === 401 ? "UNAUTHORIZED" : "ERROR"),
      message: err.message ?? "Internal server error",
    });
  });

  app.get("/", async () => ({ ok: true, service: "api" }));

  app.get("/ping", async () => ({ ok: true, ts: Date.now() }));

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

  const routeModules = [
    authRoutes,
    usersRoutes,
    servicesRoutes,
    roomsRoutes,
    appointmentsRoutes,
    creditsRoutes,
    availabilityRoutes,
    bookingActivationsRoutes,
    billingRoutes,
    invoicesRoutes,
    bankTransactionsRoutes,
    waitlistRoutes,
    reportsRoutes,
    notificationsRoutes,
    settingsRoutes,
    statsRoutes,
  ];
  for (const fn of routeModules) {
    await app.register(fn);
  }

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
