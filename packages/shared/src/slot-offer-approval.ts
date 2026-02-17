import { z } from "zod";

export const SlotOfferApprovalStatus = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type SlotOfferApprovalStatus = z.infer<typeof SlotOfferApprovalStatus>;

export const SlotOfferApprovalSchema = z.object({
  id: z.string(),
  /** Appointment IDs (freed slots) offered. */
  appointmentIds: z.array(z.string()),
  /** Client IDs to notify (candidates). */
  clientIds: z.array(z.string()),
  messageTemplate: z.string(),
  /** Optional push/in-app title (e.g. „Poslední termíny na příštích 7 dní!“). */
  pushTitle: z.string().optional(),
  status: SlotOfferApprovalStatus,
  createdAt: z.string().datetime(),
  decidedBy: z.string().optional(),
  decidedAt: z.string().datetime().optional(),
});
export type SlotOfferApproval = z.infer<typeof SlotOfferApprovalSchema>;

export const SlotOfferApprovalCreateSchema = z.object({
  appointmentIds: z.array(z.string()).min(1),
  clientIds: z.array(z.string()).min(1),
  messageTemplate: z.string(),
  pushTitle: z.string().optional(),
});
export type SlotOfferApprovalCreate = z.infer<typeof SlotOfferApprovalCreateSchema>;

export const SlotOfferApprovalDecideSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});
export type SlotOfferApprovalDecide = z.infer<typeof SlotOfferApprovalDecideSchema>;

export const SlotOfferApprovalListParamsSchema = z.object({
  status: SlotOfferApprovalStatus.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
export type SlotOfferApprovalListParams = z.infer<typeof SlotOfferApprovalListParamsSchema>;
