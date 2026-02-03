import { z } from "zod";

export const BookingActivationSchema = z.object({
  employeeId: z.string(),
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  active: z.boolean(),
});
export type BookingActivation = z.infer<typeof BookingActivationSchema>;

export const BookingActivationSetSchema = BookingActivationSchema;
export type BookingActivationSet = z.infer<typeof BookingActivationSetSchema>;

export const BookingActivationListParamsSchema = z.object({
  fromMonth: z.string().regex(/^\d{4}-\d{2}$/),
  toMonth: z.string().regex(/^\d{4}-\d{2}$/),
});
export type BookingActivationListParams = z.infer<typeof BookingActivationListParamsSchema>;
