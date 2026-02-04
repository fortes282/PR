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

/** Bulk send to selected client IDs (reception: mark clients, then send email or SMS). */
export const NotificationBulkSendBodySchema = z.object({
  clientIds: z.array(z.string()).min(1),
  channel: z.enum(["EMAIL", "SMS"]),
  subject: z.string().optional(), // for EMAIL
  message: z.string(),
  title: z.string().optional(),
});
export type NotificationBulkSendBody = z.infer<typeof NotificationBulkSendBodySchema>;

/** Web Push subscription (endpoint + keys) as stored on server for sending. */
export const PushSubscriptionSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string(),
  userAgent: z.string().optional(),
  createdAt: z.string().datetime().optional(),
});
export type PushSubscription = z.infer<typeof PushSubscriptionSchema>;

export const PushSubscribeBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
  userAgent: z.string().optional(),
});
export type PushSubscribeBody = z.infer<typeof PushSubscribeBodySchema>;

export const NotificationListParamsSchema = z.object({
  read: z.boolean().optional(),
  limit: z.number().optional(),
  appointmentId: z.string().optional(),
  blockId: z.string().optional(),
});
export type NotificationListParams = z.infer<typeof NotificationListParamsSchema>;
