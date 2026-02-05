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

/** Email address used as sender for all notification emails. */
export const NotificationEmailSenderSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});
export type NotificationEmailSender = z.infer<typeof NotificationEmailSenderSchema>;

/** FAYN SMS gateway (https://smsapi.fayn.cz/mex/api-docs/): login with username/password, then send via /sms/send. */
export const SmsFaynConfigSchema = z.object({
  enabled: z.boolean().default(false),
  baseUrl: z.string().url().default("https://smsapi.fayn.cz/mex/"),
  username: z.string().optional(),
  /** Stored encrypted on backend; not returned to client in full. */
  passwordSet: z.boolean().optional(),
});
export type SmsFaynConfig = z.infer<typeof SmsFaynConfigSchema>;

/** When to send 1st and 2nd reservation reminder email, and optional SMS. All in hours before appointment start. */
export const ReservationNotificationTimingSchema = z.object({
  /** Hours before appointment to send first reminder email. */
  firstEmailHoursBefore: z.number().int().min(0).optional(),
  /** Hours before appointment to send second reminder email. */
  secondEmailHoursBefore: z.number().int().min(0).optional(),
  /** Hours before appointment to send SMS reminder (optional; omit or 0 = disabled). */
  smsHoursBefore: z.number().int().min(0).optional(),
});
export type ReservationNotificationTiming = z.infer<typeof ReservationNotificationTimingSchema>;

/** Web Push (VAPID) and push notification behaviour. */
export const PushNotificationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  /** VAPID public key for push subscriptions (base64url). */
  vapidPublicKey: z.string().optional(),
  /** Default TTL in seconds for push payloads. */
  defaultTtlSeconds: z.number().int().min(0).optional(),
  /** Require user interaction (click) to show notification. */
  requireInteraction: z.boolean().optional(),
  /** Default badge URL. */
  badge: z.string().url().optional(),
  /** Default icon URL. */
  icon: z.string().url().optional(),
  /** When true, client app shows a prompt to enable push on first and every subsequent open until subscribed. Admin can turn off. */
  promptClientToEnablePush: z.boolean().default(true),
});
export type PushNotificationConfig = z.infer<typeof PushNotificationConfigSchema>;

export const SettingsSchema = z.object({
  freeCancelHours: z.number().min(0),
  businessHoursStart: z.string().optional(),
  businessHoursEnd: z.string().optional(),
  invoiceNumberPrefix: z.string().optional(),
  invoiceNumberNext: z.number().int().min(1).optional(),
  invoiceDueDays: z.number().int().min(1).optional(),
  invoiceIssuer: InvoiceIssuerSchema.optional(),
  /** Sender address for all notification emails. */
  notificationEmailSender: NotificationEmailSenderSchema.optional(),
  /** FAYN SMS gateway configuration. */
  smsFaynConfig: SmsFaynConfigSchema.optional(),
  /** When to send reservation reminder emails and optional SMS. */
  reservationNotificationTiming: ReservationNotificationTimingSchema.optional(),
  /** Push notification (Web Push) configuration. */
  pushNotificationConfig: PushNotificationConfigSchema.optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SettingsUpdateSchema = SettingsSchema.partial();
export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;
