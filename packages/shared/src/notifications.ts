import { z } from "zod";

export const NotificationChannel = z.enum(["EMAIL", "SMS", "PUSH", "IN_APP"]);
export type NotificationChannel = z.infer<typeof NotificationChannel>;

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  channel: NotificationChannel,
  title: z.string().optional(),
  message: z.string(),
  read: z.boolean().default(false),
  createdAt: z.string().datetime(),
  appointmentId: z.string().optional(),
  blockId: z.string().optional(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationSendBodySchema = z.object({
  channel: NotificationChannel,
  segment: z.string().optional(),
  message: z.string(),
  title: z.string().optional(),
  appointmentId: z.string().optional(),
  blockId: z.string().optional(),
});
export type NotificationSendBody = z.infer<typeof NotificationSendBodySchema>;

export const NotificationListParamsSchema = z.object({
  read: z.boolean().optional(),
  limit: z.number().optional(),
  appointmentId: z.string().optional(),
  blockId: z.string().optional(),
});
export type NotificationListParams = z.infer<typeof NotificationListParamsSchema>;
