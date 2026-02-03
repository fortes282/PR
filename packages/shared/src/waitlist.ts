import { z } from "zod";

export const WaitingListEntrySchema = z.object({
  id: z.string(),
  clientId: z.string(),
  serviceId: z.string(),
  preferredDays: z.array(z.string()).optional(),
  preferredTimeStart: z.string().optional(),
  preferredTimeEnd: z.string().optional(),
  priority: z.number().min(0).optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type WaitingListEntry = z.infer<typeof WaitingListEntrySchema>;

export const WaitlistSuggestionSchema = z.object({
  entry: WaitingListEntrySchema,
  score: z.number(),
  scoreReasons: z.array(z.string()),
  priorityBucket: z.string().optional(),
});
export type WaitlistSuggestion = z.infer<typeof WaitlistSuggestionSchema>;
