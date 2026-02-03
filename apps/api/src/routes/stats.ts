import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/stats/occupancy",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Querystring: { from: string; to: string } }>, reply: FastifyReply) => {
      const { from, to } = request.query;
      const list = Array.from(store.appointments.values()).filter(
        (a) => a.status !== "CANCELLED" && a.startAt >= from && a.endAt <= to
      );
      const byDay = new Map<string, { total: number; booked: number }>();
      for (const a of list) {
        const day = a.startAt.slice(0, 10);
        const cur = byDay.get(day) ?? { total: 8, booked: 0 };
        cur.booked += 1;
        byDay.set(day, cur);
      }
      const result = Array.from(byDay.entries()).map(([date, v]) => ({
        date,
        totalSlots: v.total,
        bookedSlots: v.booked,
        occupancyPercent: Math.round((v.booked / v.total) * 100),
      }));
      reply.send(result);
    }
  );

  app.get(
    "/stats/cancellations",
    { preHandler: [authMiddleware] },
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

  app.get("/stats/client-tags", { preHandler: [authMiddleware] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.send([
      { tag: "aktivní", count: store.users.size },
      { tag: "čekací list", count: store.waitlist.size },
    ]);
  });
}
