import { z } from "zod";

export const AvailabilitySlotSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;

export const BookableDaySchema = z.object({
  date: z.string(),
  availableCount: z.number().int().min(0),
});
export type BookableDay = z.infer<typeof BookableDaySchema>;

export const BookableDaysParamsSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});
export type BookableDaysParams = z.infer<typeof BookableDaysParamsSchema>;
