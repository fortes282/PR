import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { BillingPeriodSchema } from "@pristav/shared/billing";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";

export default async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.post("/billing/reports", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: { period?: { year: number; month: number } } }>, reply: FastifyReply) => {
    const parse = BillingPeriodSchema.safeParse(request.body?.period ?? request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body (expect period: { year, month })",
        details: parse.error.flatten(),
      });
      return;
    }
    const period = parse.data;
    const from = new Date(period.year, period.month - 1, 1).toISOString();
    const to = new Date(period.year, period.month, 0, 23, 59, 59).toISOString();
    const unpaid = Array.from(store.appointments.values()).filter(
      (a) =>
        a.paymentStatus === "UNPAID" &&
        a.status !== "CANCELLED" &&
        a.startAt >= from &&
        a.startAt <= to
    );
    const perClientTotals = new Map<string, number>();
    for (const a of unpaid) {
      const s = store.services.get(a.serviceId);
      const price = s?.priceCzk ?? 0;
      perClientTotals.set(a.clientId, (perClientTotals.get(a.clientId) ?? 0) + price);
    }
    const totalUnpaidCzk = Array.from(perClientTotals.values()).reduce((s, v) => s + v, 0);
    const id = nextId("bill");
    const report = {
      id,
      periodYear: period.year,
      periodMonth: period.month,
      unpaidAppointments: unpaid,
      totalUnpaidCzk,
      perClientTotals: Array.from(perClientTotals.entries()).map(([clientId, totalCzk]) => ({ clientId, totalCzk })),
      createdAt: new Date().toISOString(),
    };
    store.billingReports.set(id, report);
    reply.status(201).send(report);
  });

  app.get("/billing/reports/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const report = store.billingReports.get(request.params.id);
    if (!report) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Report not found" });
      return;
    }
    reply.send(report);
  });

  app.get("/billing/reports/:id/export", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const report = store.billingReports.get(request.params.id);
    if (!report) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Report not found" });
      return;
    }
    const header = "clientId;totalCzk;appointmentIds\n";
    const rows = report.perClientTotals.map(
      (p) =>
        `${p.clientId};${p.totalCzk};${report.unpaidAppointments.filter((a) => a.clientId === p.clientId).map((a) => a.id).join(",")}`
    );
    reply.type("text/csv").send(header + rows.join("\n"));
  });

  app.post(
    "/billing/reports/mark-invoiced",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Body: { appointmentIds?: string[] } }>, reply: FastifyReply) => {
      const ids = request.body?.appointmentIds ?? [];
      for (const id of ids) {
        const a = store.appointments.get(id);
        if (a) {
          const updated = { ...a, paymentStatus: "INVOICED" as const, status: "INVOICED" as const };
          store.appointments.set(id, updated);
        }
      }
      reply.status(204).send();
    }
  );
}
