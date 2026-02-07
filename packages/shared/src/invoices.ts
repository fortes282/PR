import { z } from "zod";
import { InvoiceIssuerSchema } from "./settings.js";

export const InvoiceStatusSchema = z.enum(["DRAFT", "SENT", "PAID", "OVERDUE"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceRecipientSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  street: z.string(),
  city: z.string(),
  zip: z.string(),
  country: z.string(),
  phone: z.string().optional(),
});
export type InvoiceRecipient = z.infer<typeof InvoiceRecipientSchema>;

export const InvoiceSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  number: z.string(),
  dueDate: z.string(),
  issueDate: z.string(),
  amountCzk: z.number(),
  status: InvoiceStatusSchema,
  appointmentIds: z.array(z.string()),
  issuer: InvoiceIssuerSchema.optional(),
  recipient: InvoiceRecipientSchema,
  createdAt: z.string().datetime().optional(),
  sentAt: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const InvoiceCreateSchema = z.object({
  clientId: z.string(),
  appointmentIds: z.array(z.string()).min(1),
  dueDate: z.string().optional(),
});
export type InvoiceCreate = z.infer<typeof InvoiceCreateSchema>;

export const InvoiceUpdateSchema = z.object({
  number: z.string().optional(),
  dueDate: z.string().optional(),
  amountCzk: z.number().optional(),
  recipient: InvoiceRecipientSchema.partial().optional(),
});
export type InvoiceUpdate = z.infer<typeof InvoiceUpdateSchema>;

export const InvoiceListParamsSchema = z.object({
  clientId: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type InvoiceListParams = z.infer<typeof InvoiceListParamsSchema>;
