import { z } from "zod";

export const CreditAccountSchema = z.object({
  clientId: z.string(),
  balanceCzk: z.number(),
  updatedAt: z.string().datetime().optional(),
});
export type CreditAccount = z.infer<typeof CreditAccountSchema>;

export const CreditTransactionSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  amountCzk: z.number(),
  reason: z.string(),
  appointmentId: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type CreditTransaction = z.infer<typeof CreditTransactionSchema>;

export const CreditAdjustBodySchema = z.object({
  amountCzk: z.number(),
  reason: z.string(),
});
export type CreditAdjustBody = z.infer<typeof CreditAdjustBodySchema>;
