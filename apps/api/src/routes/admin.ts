import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  SlotOfferApprovalCreateSchema,
  SlotOfferApprovalDecideSchema,
  SlotOfferApprovalListParamsSchema,
} from "@pristav/shared/slot-offer-approval";
import { store } from "../store.js";
import { authMiddleware } from "../middleware/auth.js";
import { nextId } from "../lib/id.js";
import { persistBehaviorResetLog } from "../db/persist.js";
import { createSlotOfferDraft } from "../lib/slot-offer-draft.js";

const BehaviorResetBodySchema = z.object({
  reason: z.string().optional(),
});

export default async function adminRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /admin/clients/:clientId/behavior-reset
   * ADMIN only. Audit log: score_reset with clientId, performedBy, performedAt, reason.
   * Does not delete transactional data; behavior events are derived on frontend — reset is recorded for audit and future server-side behavior engine.
   */
  app.post(
    "/clients/:clientId/behavior-reset",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { clientId: string }; Body: unknown }>, reply: FastifyReply) => {
      if (request.user?.role !== "ADMIN") {
        reply.status(403).send({ code: "FORBIDDEN", message: "Pouze administrátor může resetovat behaviorální skóre." });
        return;
      }
      const clientId = request.params.clientId;
      const client = store.users.get(clientId);
      if (!client) {
        reply.status(404).send({ code: "NOT_FOUND", message: "Klient nenalezen." });
        return;
      }
      if (client.role !== "CLIENT") {
        reply.status(400).send({ code: "BAD_REQUEST", message: "Reset skóre je pouze pro klienty." });
        return;
      }
      const parse = BehaviorResetBodySchema.safeParse(request.body);
      const body = parse.success ? parse.data : {};
      const performedBy = request.user!.userId;
      const performedAt = new Date().toISOString();
      const id = nextId("br");
      persistBehaviorResetLog({
        id,
        clientId,
        performedBy,
        performedAt,
        reason: body.reason ?? null,
        previousScoresJson: null,
      });
      request.log.info({ clientId, performedBy }, "Behavior score reset");
      reply.send({ ok: true, message: "Behaviorální skóre klienta bylo zresetováno (záznam do auditu)." });
    }
  );

  const allowedSlotOfferRoles = ["ADMIN", "RECEPTION"];

  /** GET /admin/slot-offer-approvals — list approvals (filter by status), ADMIN or RECEPTION */
  app.get(
    "/slot-offer-approvals",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Querystring: { status?: string; limit?: string; offset?: string } }>, reply: FastifyReply) => {
      if (!allowedSlotOfferRoles.includes(request.user!.role as string)) {
        reply.status(403).send({ code: "FORBIDDEN", message: "Pouze admin nebo recepce." });
        return;
      }
      const parse = SlotOfferApprovalListParamsSchema.safeParse({
        status: request.query.status as "PENDING" | "APPROVED" | "REJECTED" | undefined,
        limit: request.query.limit ? Number(request.query.limit) : undefined,
        offset: request.query.offset ? Number(request.query.offset) : undefined,
      });
      const params = parse.success ? parse.data : {};
      let list = Array.from(store.slotOfferApprovals.values());
      if (params.status) list = list.filter((a) => a.status === params.status);
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const offset = params.offset ?? 0;
      const limit = params.limit ?? 50;
      const approvals = list.slice(offset, offset + limit);
      reply.send({ approvals, total: list.length });
    }
  );

  /** POST /admin/slot-offer-approvals — create draft; notify ADMIN and RECEPTION (in-app APPROVAL_REQUEST) */
  app.post(
    "/slot-offer-approvals",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      if (!allowedSlotOfferRoles.includes(request.user!.role as string)) {
        reply.status(403).send({ code: "FORBIDDEN", message: "Pouze admin nebo recepce." });
        return;
      }
      const parse = SlotOfferApprovalCreateSchema.safeParse(request.body);
      if (!parse.success) {
        reply.status(400).send({ code: "VALIDATION_ERROR", message: "Neplatná data", details: parse.error.flatten() });
        return;
      }
      const body = parse.data;
      const approval = await createSlotOfferDraft(
        store,
        {
          appointmentIds: body.appointmentIds,
          clientIds: body.clientIds,
          messageTemplate: body.messageTemplate,
        },
        request.log
      );
      reply.status(201).send(approval);
    }
  );

  /** PATCH /admin/slot-offer-approvals/:id — approve or reject; if APPROVED, send SLOT_OFFER to clients */
  app.patch(
    "/slot-offer-approvals/:id",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: unknown }>, reply: FastifyReply) => {
      if (!allowedSlotOfferRoles.includes(request.user!.role as string)) {
        reply.status(403).send({ code: "FORBIDDEN", message: "Pouze admin nebo recepce." });
        return;
      }
      const approval = store.slotOfferApprovals.get(request.params.id);
      if (!approval) {
        reply.status(404).send({ code: "NOT_FOUND", message: "Schválení nenalezeno." });
        return;
      }
      if (approval.status !== "PENDING") {
        reply.status(400).send({ code: "BAD_REQUEST", message: "Toto schválení již bylo rozhodnuto." });
        return;
      }
      const parse = SlotOfferApprovalDecideSchema.safeParse(request.body);
      if (!parse.success) {
        reply.status(400).send({ code: "VALIDATION_ERROR", message: "Neplatná data", details: parse.error.flatten() });
        return;
      }
      const decidedBy = request.user!.userId;
      const decidedAt = new Date().toISOString();
      const updated = { ...approval, status: parse.data.status, decidedBy, decidedAt };
      store.slotOfferApprovals.set(approval.id, updated);
      persistSlotOfferApproval(store, updated);

      if (parse.data.status === "APPROVED") {
        for (const clientId of approval.clientIds) {
          const n = {
            id: nextId("n"),
            userId: clientId,
            channel: "IN_APP" as const,
            title: "Nabídka volného termínu",
            message: approval.messageTemplate,
            read: false,
            createdAt: new Date().toISOString(),
            purpose: "SLOT_OFFER" as const,
          };
          store.notifications.set(n.id, n);
          persistNotification(store, n);
        }
      }

      reply.send(updated);
    }
  );
}
