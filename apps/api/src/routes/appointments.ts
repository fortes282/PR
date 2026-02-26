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
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";
import { persistAppointment, persistCreditAccount, persistCreditTransaction, persistNotification } from "../db/persist.js";
import { createSlotOfferDraft, getWaitlistCandidateClientIds, sendSlotOfferToClients } from "../lib/slot-offer-draft.js";

export default async function appointmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/appointments",
    { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION", "EMPLOYEE", "CLIENT")] },
    async (request: FastifyRequest<{ Querystring: { clientId?: string; employeeId?: string; from?: string; to?: string; status?: string } }>, reply: FastifyReply) => {
      const { clientId, employeeId, from, to, status } = request.query;
      let list = Array.from(store.appointments.values());
      if (clientId) list = list.filter((a) => a.clientId === clientId);
      if (employeeId) list = list.filter((a) => a.employeeId === employeeId);
      if (from) list = list.filter((a) => a.startAt >= from);
      if (to) list = list.filter((a) => a.endAt <= to);
      if (request.user?.role === "CLIENT") list = list.filter((a) => a.clientId === request.user!.userId);
      if (status) list = list.filter((a) => a.status === status);
      list.sort((a, b) => a.startAt.localeCompare(b.startAt));
      reply.send(list);
    }
  );

  app.get("/appointments/:id", { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION", "EMPLOYEE", "CLIENT")] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const appointment = store.appointments.get(request.params.id);
    if (!appointment) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Termín nenalezen." });
      return;
    }
    if (request.user?.role === "CLIENT" && appointment.clientId !== request.user.userId) {
      reply.status(403).send({ code: "FORBIDDEN", message: "Nedostatečná oprávnění." });
      return;
    }
    reply.send(appointment);
  });

  app.post("/appointments", { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION", "CLIENT")] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = AppointmentCreateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ code: "VALIDATION_ERROR", message: "Neplatná data.", details: parse.error.flatten() });
      return;
    }
    const data = parse.data;
    const service = store.services.get(data.serviceId);
    if (!service) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Služba nenalezena." });
      return;
    }
    if (service.active === false) {
      reply.status(400).send({ code: "VALIDATION_ERROR", message: "Služba je neaktivní." });
      return;
    }
    const room = data.roomId ? store.rooms.get(data.roomId) : null;
    if (data.roomId && !room) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Místnost nenalezena." });
      return;
    }
    if (room && (room as { active?: boolean }).active === false) {
      reply.status(400).send({ code: "VALIDATION_ERROR", message: "Místnost je neaktivní." });
      return;
    }
    if (data.employeeId) {
      const emp = store.users.get(data.employeeId);
      if (!emp) {
        reply.status(404).send({ code: "NOT_FOUND", message: "Terapeut nenalezen." });
        return;
      }
      if (emp.role !== "EMPLOYEE" || emp.active === false) {
        reply.status(400).send({ code: "VALIDATION_ERROR", message: "Terapeut je neaktivní nebo neplatný." });
        return;
      }
    }
    const startTime = new Date(data.startAt).getTime();
    const endTime = new Date(data.endAt).getTime();
    if (endTime <= startTime) {
      reply.status(400).send({ code: "VALIDATION_ERROR", message: "Konec termínu musí být po začátku." });
      return;
    }
    const existing = Array.from(store.appointments.values()).filter((a) => a.status !== "CANCELLED");
    const roomConflict = existing.find((a) => a.roomId === data.roomId && new Date(a.startAt).getTime() < endTime && new Date(a.endAt).getTime() > startTime);
    if (roomConflict) {
      reply.status(409).send({ code: "CONFLICT", message: "Místnost je v tomto čase již obsazena." });
      return;
    }
    if (data.employeeId) {
      const empConflict = existing.find((a) => a.employeeId === data.employeeId && new Date(a.startAt).getTime() < endTime && new Date(a.endAt).getTime() > startTime);
      if (empConflict) {
        reply.status(409).send({ code: "CONFLICT", message: "Terapeut má v tomto čase jiný termín." });
        return;
      }
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
    persistAppointment(store, appointment);
    if (paymentStatus === "PAID" && account && !isClientOnly) {
      account.balanceCzk -= service.priceCzk;
      account.updatedAt = new Date().toISOString();
      persistCreditAccount(store, account);
      const tx: CreditTransaction = {
        id: nextId("tx"),
        clientId: data.clientId,
        amountCzk: -service.priceCzk,
        reason: "Platba za termín",
        appointmentId: id,
        createdAt: new Date().toISOString(),
      };
      persistCreditTransaction(store, tx);
    }
    const startDate = new Date(data.startAt);
    const dateStr = startDate.toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const confirmNotif: Notification = {
      id: nextId("n"),
      userId: data.clientId,
      channel: "IN_APP",
      title: "Rezervace potvrzena",
      message: `Váš termín ${dateStr} (${service.name}) byl úspěšně zarezervován.`,
      read: false,
      createdAt: new Date().toISOString(),
      appointmentId: id,
    };
    store.notifications.set(confirmNotif.id, confirmNotif);
    persistNotification(store, confirmNotif);
    reply.status(201).send(appointment);
  });

  app.post("/appointments/blocks", { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION", "CLIENT")] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = TherapyBlockCreateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ code: "VALIDATION_ERROR", message: "Neplatná data.", details: parse.error.flatten() });
      return;
    }
    const data = parse.data;
    const blockId = nextId("block");
    const service = store.services.get(data.serviceId);
    if (!service) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Služba nenalezena." });
      return;
    }
    if (!store.rooms.get(data.roomId)) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Místnost nenalezena." });
      return;
    }
    const appointments: Appointment[] = [];
    for (const slot of data.slots) {
      const account = store.creditAccounts.get(data.clientId);
      const balance = account?.balanceCzk ?? 0;
      const paymentStatus: PaymentStatus = balance >= service.priceCzk ? "PAID" : "UNPAID";
      const appId = nextId("app");
      const appt: Appointment = {
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
      persistAppointment(store, appt);
      appointments.push(appt);
      if (paymentStatus === "PAID" && account) {
        account.balanceCzk -= service.priceCzk;
        account.updatedAt = new Date().toISOString();
        persistCreditAccount(store, account);
        const tx: CreditTransaction = {
          id: nextId("tx"),
          clientId: data.clientId,
          amountCzk: -service.priceCzk,
          reason: "Platba za termín (blok)",
          appointmentId: appId,
          createdAt: new Date().toISOString(),
        };
        persistCreditTransaction(store, tx);
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
    persistNotification(store, n);
    reply.status(201).send({ blockId, appointments });
  });

  app.put("/appointments/:id", { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION")] }, async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
    const appointment = store.appointments.get(request.params.id);
    if (!appointment) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Termín nenalezen." });
      return;
    }
    const parse = AppointmentUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({ code: "VALIDATION_ERROR", message: "Neplatná data.", details: parse.error.flatten() });
      return;
    }
    const updated = { ...appointment, ...parse.data };
    persistAppointment(store, updated);
    reply.send(updated);
  });

  app.post(
    "/appointments/:id/cancel",
    { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION", "EMPLOYEE", "CLIENT")] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
      const id = request.params.id;
      const appointment = store.appointments.get(id);
      if (!appointment) {
        reply.status(404).send({ code: "NOT_FOUND", message: "Termín nenalezen." });
        return;
      }
      if (request.user?.role === "CLIENT" && appointment.clientId !== request.user.userId) {
        reply.status(403).send({ code: "FORBIDDEN", message: "Nelze zrušit termín jiného uživatele." });
        return;
      }
      if (appointment.status === "CANCELLED") {
        reply.status(409).send({ code: "CONFLICT", message: "Termín je již zrušen." });
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
      persistAppointment(store, updated);
      let creditTransaction: CreditTransaction | undefined;
      if (doRefund && price > 0) {
        const account = store.creditAccounts.get(appointment.clientId);
        if (account) {
          account.balanceCzk += price;
          account.updatedAt = new Date().toISOString();
          persistCreditAccount(store, account);
          creditTransaction = {
            id: nextId("tx"),
            clientId: appointment.clientId,
            amountCzk: price,
            reason: "Vrácení za zrušený termín",
            appointmentId: id,
            createdAt: new Date().toISOString(),
          };
          persistCreditTransaction(store, creditTransaction);
        }
      }

      const behaviorSlotOfferMode = (store.settings as { behaviorSlotOfferMode?: string }).behaviorSlotOfferMode;
      if (behaviorSlotOfferMode === "manual" || behaviorSlotOfferMode === "auto") {
        const candidateClientIds = getWaitlistCandidateClientIds(store, appointment.serviceId, 20);
        if (candidateClientIds.length > 0) {
          const startDate = new Date(appointment.startAt);
          const dateStr = startDate.toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
          const serviceName = store.services.get(appointment.serviceId)?.name ?? "termín";
          const messageTemplate = `Uvolnil se termín ${dateStr} (${serviceName}). Máte zájem? Rezervujte si ho v aplikaci.`;
          try {
            if (behaviorSlotOfferMode === "manual") {
              await createSlotOfferDraft(
                store,
                { appointmentIds: [id], clientIds: candidateClientIds, messageTemplate },
                request.log
              );
            } else {
              await sendSlotOfferToClients(store, candidateClientIds, messageTemplate, request.log);
            }
          } catch (err: unknown) {
            request.log.warn({ err, appointmentId: id }, "Slot offer failed");
          }
        }
      }

      const reengage = {
        id: nextId("n"),
        userId: appointment.clientId,
        channel: "IN_APP" as const,
        title: "Termín zrušen",
        message: "Zrušil jste termín. Můžete si vybrat jiný volný termín v aplikaci.",
        read: false,
        createdAt: new Date().toISOString(),
        purpose: "REENGAGE" as const,
      };
      store.notifications.set(reengage.id, reengage);
      persistNotification(store, reengage);

      reply.send({ appointment: updated, creditTransaction });
    }
  );

  app.post("/appointments/:id/complete", { preHandler: [authMiddleware, requireRole("ADMIN", "RECEPTION", "EMPLOYEE")] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const appointment = store.appointments.get(request.params.id);
    if (!appointment) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Termín nenalezen." });
      return;
    }
    if (appointment.status === "CANCELLED") {
      reply.status(409).send({ code: "CONFLICT", message: "Nelze dokončit zrušený termín." });
      return;
    }
    if (appointment.status === "COMPLETED") {
      reply.status(409).send({ code: "CONFLICT", message: "Termín je již dokončen." });
      return;
    }
    const updated = { ...appointment, status: "COMPLETED" as const };
    persistAppointment(store, updated);
    reply.send(updated);
  });
}
