import { z } from "zod";

export const OccupancyStatSchema = z.object({
  date: z.string(),
  totalSlots: z.number(),
  bookedSlots: z.number(),
  occupancyPercent: z.number(),
});
export type OccupancyStat = z.infer<typeof OccupancyStatSchema>;

export const CancellationStatSchema = z.object({
  period: z.string(),
  count: z.number(),
  withRefund: z.number(),
});
export type CancellationStat = z.infer<typeof CancellationStatSchema>;

export const ClientTagStatSchema = z.object({
  tag: z.string(),
  count: z.number(),
});
export type ClientTagStat = z.infer<typeof ClientTagStatSchema>;
