import { z } from "zod";

/** Month 1–12: rozmezí měsíců na celý rok dopředu (kdy klient chce termín). */
export const WaitingListEntrySchema = z.object({
  id: z.string(),
  clientId: z.string(),
  serviceId: z.string(),
  preferredDays: z.array(z.string()).optional(),
  preferredTimeStart: z.string().optional(),
  preferredTimeEnd: z.string().optional(),
  /** Měsíc od (1–12) – platí pro celý rok dopředu. */
  preferredMonthFrom: z.number().min(1).max(12).optional(),
  /** Měsíc do (1–12) – platí pro celý rok dopředu. */
  preferredMonthTo: z.number().min(1).max(12).optional(),
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
