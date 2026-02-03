import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { Invoice, InvoiceRecipient } from "@pristav/shared/invoices";
import type { Appointment } from "@pristav/shared/appointments";
import { InvoiceCreateSchema, InvoiceUpdateSchema, InvoiceListParamsSchema } from "@pristav/shared/invoices";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";
import { addDays } from "../lib/date.js";

export default async function invoicesRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/invoices",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Querystring: { clientId?: string; status?: string; from?: string; to?: string } }>, reply: FastifyReply) => {
      const parse = InvoiceListParamsSchema.safeParse(request.query);
      const params = parse.success ? parse.data : {};
      let list = Array.from(store.invoices.values());
      if (params.clientId) list = list.filter((i) => i.clientId === params.clientId);
      if (params.status) list = list.filter((i) => i.status === params.status);
      if (params.from) list = list.filter((i) => i.issueDate >= params.from!);
      if (params.to) list = list.filter((i) => i.issueDate <= params.to!);
      list.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
      reply.send(list);
    }
  );

  app.get("/invoices/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const invoice = store.invoices.get(request.params.id);
    if (!invoice) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Invoice not found" });
      return;
    }
    reply.send(invoice);
  });

  app.post("/invoices", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parse = InvoiceCreateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const data = parse.data;
    const client = store.users.get(data.clientId);
    if (!client) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Client not found" });
      return;
    }
    const addr = client.billingAddress;
    if (!addr?.street || !addr?.city || !addr?.zip) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Pro vygenerování faktury vyplňte u klienta: jméno, příjmení, ulici, město a PSČ.",
      });
      return;
    }
    const recipient: InvoiceRecipient = {
      firstName: client.firstName ?? client.name.split(" ")[0] ?? "",
      lastName: client.lastName ?? client.name.split(" ").slice(1).join(" ") ?? "",
      street: addr.street,
      city: addr.city,
      zip: addr.zip,
      country: addr.country ?? "CZ",
      phone: client.phone,
    };
    const settings = store.settings;
    const prefix = settings.invoiceNumberPrefix ?? "F";
    const nextNum = (settings as { invoiceNumberNext?: number }).invoiceNumberNext ?? 1;
    const number = `${prefix}-${String(nextNum).padStart(6, "0")}`;
    (store.settings as Record<string, unknown>).invoiceNumberNext = nextNum + 1;
    const issueDate = new Date().toISOString().slice(0, 10);
    const dueDays = settings.invoiceDueDays ?? 14;
    const dueDate = data.dueDate ?? addDays(new Date(), dueDays).toISOString().slice(0, 10);
    const appointments = data.appointmentIds
      .map((id) => store.appointments.get(id))
      .filter(Boolean) as Appointment[];
    let amountCzk = 0;
    for (const a of appointments) {
      const s = store.services.get(a.serviceId);
      amountCzk += s?.priceCzk ?? 0;
    }
    const id = nextId("inv");
    const invoice: Invoice = {
      id,
      clientId: data.clientId,
      number,
      dueDate,
      issueDate,
      amountCzk,
      status: "DRAFT",
      appointmentIds: data.appointmentIds,
      issuer: settings.invoiceIssuer,
      recipient,
      createdAt: new Date().toISOString(),
    };
    store.invoices.set(id, invoice);
    reply.status(201).send(invoice);
  });

  app.put("/invoices/:id", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
    const inv = store.invoices.get(request.params.id);
    if (!inv) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Invoice not found" });
      return;
    }
    const parse = InvoiceUpdateSchema.safeParse(request.body);
    if (!parse.success) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid body",
        details: parse.error.flatten(),
      });
      return;
    }
    const recipient = parse.data.recipient ? { ...inv.recipient, ...parse.data.recipient } : inv.recipient;
    const updated = { ...inv, ...parse.data, recipient };
    store.invoices.set(inv.id, updated);
    reply.send(updated);
  });

  app.post("/invoices/:id/send", { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const inv = store.invoices.get(request.params.id);
    if (!inv) {
      reply.status(404).send({ code: "NOT_FOUND", message: "Invoice not found" });
      return;
    }
    const updated = { ...inv, status: "SENT" as const, sentAt: new Date().toISOString() };
    store.invoices.set(inv.id, updated);
    reply.status(204).send();
  });

  app.post(
    "/invoices/send-bulk",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Body: { invoiceIds?: string[] } }>, reply: FastifyReply) => {
      const ids = request.body?.invoiceIds ?? [];
      for (const invoiceId of ids) {
        const inv = store.invoices.get(invoiceId);
        if (inv) {
          const updated = { ...inv, status: "SENT" as const, sentAt: new Date().toISOString() };
          store.invoices.set(invoiceId, updated);
        }
      }
      reply.status(204).send();
    }
  );

  app.post("/invoices/send-overdue-reminders", { preHandler: [authMiddleware] }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const today = new Date().toISOString().slice(0, 10);
    let sent = 0;
    for (const inv of Array.from(store.invoices.values())) {
      if (inv.status === "SENT" && inv.dueDate < today) {
        const n = {
          id: nextId("n"),
          userId: inv.clientId,
          channel: "EMAIL" as const,
          message: `Upomínka: Faktura ${inv.number} je po splatnosti (${inv.dueDate}).`,
          title: "Upomínka k faktuře",
          read: false,
          createdAt: new Date().toISOString(),
        };
        store.notifications.set(n.id, n);
        sent += 1;
      }
    }
    reply.send({ sent });
  });
}
