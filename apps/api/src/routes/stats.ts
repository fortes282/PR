import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { store } from "../store.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

function getSlotsPerDay(): number {
  const employees = Array.from(store.users.values()).filter(
    (u) => u.role === "EMPLOYEE" && u.active !== false
  );
  if (employees.length === 0) return 8;

  let totalHours = 0;
  for (const emp of employees) {
    const wh = emp.workingHours;
    if (!wh || wh.length === 0) {
      totalHours += 8;
      continue;
    }
    const weekdaySlots = wh.filter((s) => s.dayOfWeek >= 1 && s.dayOfWeek <= 5);
    if (weekdaySlots.length === 0) {
      totalHours += 8;
      continue;
    }
    let empHours = 0;
    for (const slot of weekdaySlots) {
      const [sh, sm] = (slot.start ?? "08:00").split(":").map(Number);
      const [eh, em] = (slot.end ?? "17:00").split(":").map(Number);
      empHours += ((eh ?? 17) * 60 + (em ?? 0) - (sh ?? 8) * 60 - (sm ?? 0)) / 60;
    }
    const avgPerDay = empHours / 5;
    totalHours += avgPerDay;
  }

  return Math.max(1, Math.round(totalHours));
}

export default async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/stats/occupancy",
    { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION")] },
    async (request: FastifyRequest<{ Querystring: { from: string; to: string } }>, reply: FastifyReply) => {
      const { from, to } = request.query;
      const slotsPerDay = getSlotsPerDay();
      const list = Array.from(store.appointments.values()).filter(
        (a) => a.status !== "CANCELLED" && a.startAt >= from && a.endAt <= to
      );
      const byDay = new Map<string, number>();
      for (const a of list) {
        const day = a.startAt.slice(0, 10);
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
      }
      const result = Array.from(byDay.entries())
        .map(([date, booked]) => ({
          date,
          totalSlots: slotsPerDay,
          bookedSlots: booked,
          occupancyPercent: Math.min(100, Math.round((booked / slotsPerDay) * 100)),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      reply.send(result);
    }
  );

  app.get(
    "/stats/cancellations",
    { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION")] },
    async (request: FastifyRequest<{ Querystring: { from: string; to: string } }>, reply: FastifyReply) => {
      const { from, to } = request.query;
      const cancelled = Array.from(store.appointments.values()).filter(
        (a) =>
          a.status === "CANCELLED" &&
          a.cancelledAt &&
          a.cancelledAt >= from &&
          a.cancelledAt <= to
      );
      const withRefund = cancelled.filter((a) => a.paymentStatus === "REFUNDED").length;
      reply.send([{ period: `${from}–${to}`, count: cancelled.length, withRefund }]);
    }
  );

  app.get(
    "/stats/client-tags",
    { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION")] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const clients = Array.from(store.users.values()).filter((u) => u.role === "CLIENT");
      const active = clients.filter((u) => u.active !== false);
      const inactive = clients.filter((u) => u.active === false);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
      const appointments = Array.from(store.appointments.values());

      const recentClients = new Set(
        appointments
          .filter((a) => a.status !== "CANCELLED" && a.startAt >= thirtyDaysAgo)
          .map((a) => a.clientId)
      );

      const futureClients = new Set(
        appointments
          .filter((a) => a.status !== "CANCELLED" && a.startAt > now.toISOString())
          .map((a) => a.clientId)
      );

      const waitlistClients = new Set(
        Array.from(store.waitlist.values()).map((w) => w.clientId)
      );

      const tags: { tag: string; count: number }[] = [
        { tag: "Aktivní klienti", count: active.length },
        { tag: "Nedávná návštěva (30 dní)", count: recentClients.size },
        { tag: "Budoucí termín", count: futureClients.size },
        { tag: "Na čekacím listu", count: waitlistClients.size },
      ];
      if (inactive.length > 0) {
        tags.push({ tag: "Neaktivní", count: inactive.length });
      }

      reply.send(tags);
    }
  );
}
