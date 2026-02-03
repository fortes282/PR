import { z } from "zod";

export const InvoiceIssuerSchema = z.object({
  name: z.string(),
  street: z.string(),
  city: z.string(),
  zip: z.string(),
  country: z.string().default("CZ"),
  ico: z.string().optional(),
  dic: z.string().optional(),
});
export type InvoiceIssuer = z.infer<typeof InvoiceIssuerSchema>;

export const SettingsSchema = z.object({
  freeCancelHours: z.number().min(0),
  businessHoursStart: z.string().optional(),
  businessHoursEnd: z.string().optional(),
  invoiceNumberPrefix: z.string().optional(),
  invoiceNumberNext: z.number().int().min(1).optional(),
  invoiceDueDays: z.number().int().min(1).optional(),
  invoiceIssuer: InvoiceIssuerSchema.optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SettingsUpdateSchema = SettingsSchema.partial();
export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;
