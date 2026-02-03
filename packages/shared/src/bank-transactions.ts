import { z } from "zod";

export const BankTransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  amountCzk: z.number(),
  variableSymbol: z.string().optional(),
  message: z.string().optional(),
  counterpartAccount: z.string().optional(),
  counterpartName: z.string().optional(),
  invoiceId: z.string().optional(),
  matchedAt: z.string().datetime().optional(),
});
export type BankTransaction = z.infer<typeof BankTransactionSchema>;

export const BankTransactionListParamsSchema = z.object({
  from: z.string(),
  to: z.string(),
});
export type BankTransactionListParams = z.infer<typeof BankTransactionListParamsSchema>;
