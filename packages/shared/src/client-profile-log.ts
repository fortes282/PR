import { z } from "zod";

/** Kind of event in the client profile log (visible to admin and reception). */
export const ClientProfileLogKindSchema = z.enum([
  "NOTIFICATION_SENT",
  "DATA_CHANGE",
  "EVALUATION_UPDATE",
  "PASSWORD_RESET_REQUESTED",
  "ROLE_OR_ACTIVE_CHANGED",
]);
export type ClientProfileLogKind = z.infer<typeof ClientProfileLogKindSchema>;

export const ClientProfileLogEntrySchema = z.object({
  id: z.string(),
  clientId: z.string(),
  kind: ClientProfileLogKindSchema,
  /** Human-readable summary */
  summary: z.string(),
  /** Optional detail (e.g. which fields changed, notification channel) */
  detail: z.string().optional(),
  /** Who performed the action (userId or "system") */
  actorId: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type ClientProfileLogEntry = z.infer<typeof ClientProfileLogEntrySchema>;

export const ClientProfileLogListParamsSchema = z.object({
  clientId: z.string(),
  limit: z.number().min(1).max(100).optional(),
});
export type ClientProfileLogListParams = z.infer<typeof ClientProfileLogListParamsSchema>;
