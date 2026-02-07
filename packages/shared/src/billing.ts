import { z } from "zod";
import { AppointmentSchema } from "./appointments.js";

export const BillingReportSchema = z.object({
  id: z.string(),
  periodYear: z.number(),
  periodMonth: z.number(),
  unpaidAppointments: z.array(AppointmentSchema),
  totalUnpaidCzk: z.number(),
  perClientTotals: z.array(z.object({ clientId: z.string(), totalCzk: z.number() })),
  createdAt: z.string().datetime().optional(),
});
export type BillingReport = z.infer<typeof BillingReportSchema>;

export const BillingPeriodSchema = z.object({
  year: z.number(),
  month: z.number().min(1).max(12),
});
export type BillingPeriod = z.infer<typeof BillingPeriodSchema>;
