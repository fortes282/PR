import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AppointmentStatus, PaymentStatus } from "@pristav/shared/appointments";
import {
  AppointmentCreateSchema,
  AppointmentUpdateSchema,
  AppointmentCancelBodySchema,
  TherapyBlockCreateSchema,
} from "@pristav/shared/appointments";
import type { Appointment } from "@pristav/shared/appointments";
import type { CreditTransaction } from "@pristav/shared/credits";
import type { Notification } from "@pristav/shared/notifications";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";

export default async function appointmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/appointments",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { clientId, employeeId, from, to, status } = request.query as { clientId?: string; employeeId?: string; from?: string; to?: string; status?: string };
      let list = Array.from(store.appointments.values());
      if (clientId) list = list.filter((a) => a.clientId === clientId);
      if (employeeId) list = list.filter((a) => a.employeeId === employeeId);
      if (from) list = list.filter((a) => a.startAt >= from);
      if (to) list = list.filter((a) => a.endAt <= to);
      if (status) list = list.filter((a) => a.status === status);
      list.sort((a, b) => a.startAt.localeCompare(b.startAt));
      reply.send(list);
    }
  );

  app.get("/appointments/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const appointment = store.appointments.get((request.params as { id: string }).id);
    if (!appointment) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Appointment not found" });
      return;
    }
    reply.send(appointment);
  });

  app.post("/appointments", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parse = AppointmentCreateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid body", details: parse.error.flatten() });
      return;
    }
    const data = parse.data;
    const service = store.services.get(data.serviceId);
    if (!service) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Service not found" });
      return;
    }
    const account = store.creditAccounts.get(data.clientId);
    const balance = account?.balanceCzk ?? 0;
    const isClientOnly = !data.employeeId;
    const paymentStatus: PaymentStatus = isClientOnly ? "UNPAID" : balance >= service.priceCzk ? "PAID" : "UNPAID";
    const status: AppointmentStatus = "SCHEDULED";
    const id = nextId("app");
    const appointment: Appointment = {
      ...data,
      id,
      status,
      paymentStatus,
    };
    store.appointments.set(id, appointment);
    if (paymentStatus === "PAID" && account && !isClientOnly) {
      account.balanceCzk -= service.priceCzk;
      account.updatedAt = new Date().toISOString();
      const tx: CreditTransaction = {
        id: nextId("tx"),
        clientId: data.clientId,
        amountCzk: -service.priceCzk,
        reason: "Platba za termín",
        appointmentId: id,
        createdAt: new Date().toISOString(),
      };
      store.creditTransactions.set(tx.id, tx);
    }
    reply.status(201).send(appointment);
  });

  app.post("/appointments/blocks", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parse = TherapyBlockCreateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid body", details: parse.error.flatten() });
      return;
    }
    const data = parse.data;
    const blockId = nextId("block");
    const service = store.services.get(data.serviceId);
    if (!service) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Service not found" });
      return;
    }
    if (!store.rooms.get(data.roomId)) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Room not found" });
      return;
    }
    const appointments: Appointment[] = [];
    for (const slot of data.slots) {
      const account = store.creditAccounts.get(data.clientId);
      const balance = account?.balanceCzk ?? 0;
      const paymentStatus: PaymentStatus = balance >= service.priceCzk ? "PAID" : "UNPAID";
      const appId = nextId("app");
      const app: Appointment = {
        id: appId,
        clientId: data.clientId,
        employeeId: data.employeeId,
        serviceId: data.serviceId,
        roomId: data.roomId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: "SCHEDULED",
        paymentStatus,
        blockId,
      };
      store.appointments.set(appId, app);
      appointments.push(app);
      if (paymentStatus === "PAID" && account) {
        account.balanceCzk -= service.priceCzk;
        account.updatedAt = new Date().toISOString();
        const tx: CreditTransaction = {
          id: nextId("tx"),
          clientId: data.clientId,
          amountCzk: -service.priceCzk,
          reason: "Platba za termín (blok)",
          appointmentId: appId,
          createdAt: new Date().toISOString(),
        };
        store.creditTransactions.set(tx.id, tx);
      }
    }
    const firstStart = data.slots[0]?.startAt ?? "";
    const n: Notification = {
      id: nextId("n"),
      channel: "IN_APP",
      title: "Intenzivní blok rezervován",
      message: `Rezervován intenzivní blok (${data.slots.length} slotů) od ${firstStart.slice(0, 16)}.`,
      read: false,
      createdAt: new Date().toISOString(),
      blockId,
    };
    store.notifications.set(n.id, n);
    reply.status(201).send({ blockId, appointments });
  });

  app.put("/appointments/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const appointment = store.appointments.get((request.params as { id: string }).id);
    if (!appointment) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Appointment not found" });
      return;
    }
    const parse = AppointmentUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ code: "VALIDATION_ERROR", message: "Invalid body", details: parse.error.flatten() });
      return;
    }
    const updated = { ...appointment, ...parse.data };
    store.appointments.set(appointment.id, updated);
    reply.send(updated);
  });

  app.post(
    "/appointments/:id/cancel",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const id = (request.params as { id: string }).id;
      const appointment = store.appointments.get(id);
      if (!appointment) {
        reply.status(404).send({ code: "NOT_FOUND", message: "Appointment not found" });
        return;
      }
      if (appointment.status === "CANCELLED") {
        reply.status(409).send({ code: "CONFLICT", message: "Already cancelled" });
        return;
      }
      const parse = AppointmentCancelBodySchema.safeParse(request.body ?? {});
      const body = parse.success ? parse.data : {};
      const service = store.services.get(appointment.serviceId);
      const price = service?.priceCzk ?? 0;
      const start = new Date(appointment.startAt);
      const now = new Date();
      const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
      const freeCancelHours = store.settings.freeCancelHours;
      const canRefund = appointment.paymentStatus === "PAID" && hoursUntil >= freeCancelHours;
      const doRefund = body.refund ?? canRefund;
      const updated: Appointment = {
        ...appointment,
        status: "CANCELLED",
        paymentStatus: doRefund ? "REFUNDED" : appointment.paymentStatus,
        cancelReason: body.reason ?? "",
        cancelledAt: new Date().toISOString(),
      };
      store.appointments.set(id, updated);
      let creditTransaction: CreditTransaction | undefined;
      if (doRefund && price > 0) {
        const account = store.creditAccounts.get(appointment.clientId);
        if (account) {
          account.balanceCzk += price;
          account.updatedAt = new Date().toISOString();
          creditTransaction = {
            id: nextId("tx"),
            clientId: appointment.clientId,
            amountCzk: price,
            reason: "Vrácení za zrušený termín",
            appointmentId: id,
            createdAt: new Date().toISOString(),
          };
          store.creditTransactions.set(creditTransaction.id, creditTransaction);
        }
      }
      reply.send({ appointment: updated, creditTransaction });
    }
  );

  app.post("/appointments/:id/complete", { preHandler: [authMiddleware] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const appointment = store.appointments.get((request.params as { id: string }).id);
    if (!appointment) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Appointment not found" });
      return;
    }
    const updated = { ...appointment, status: "COMPLETED" as const };
    store.appointments.set(appointment.id, updated);
    reply.send(updated);
  });
}
