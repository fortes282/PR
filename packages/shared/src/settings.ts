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

/** SMSAPI.com (https://www.smsapi.com/docs): OAuth token v env SMSAPI_TOKEN, odeslání přes POST sms.do. */
export const SmsSmsapiConfigSchema = z.object({
  enabled: z.boolean().default(false),
  /** Jméno odesílatele (ověřené v SMSAPI portálu). Výchozí „Test“. */
  senderName: z.string().optional(),
  /** Zpětná kompatibilita: dříve uložené username lze použít jako senderName. */
  username: z.string().optional(),
});
export type SmsSmsapiConfig = z.infer<typeof SmsSmsapiConfigSchema>;

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
  /** SMSAPI.com konfigurace (odesílatel). Token se bere z env SMSAPI_TOKEN. */
  smsSmsapiConfig: SmsSmsapiConfigSchema.optional(),
  /** When to send reservation reminder emails and optional SMS. */
  reservationNotificationTiming: ReservationNotificationTimingSchema.optional(),
  /** Push notification (Web Push) configuration. */
  pushNotificationConfig: PushNotificationConfigSchema.optional(),
  /** When a freed slot is offered: auto = send to candidates immediately; manual = create draft and notify admin/reception for approval. */
  behaviorSlotOfferMode: z.enum(["auto", "manual"]).optional(),
  /** Optional: extra emails to notify when a slot offer is pending approval (in addition to in-app for admin/reception). */
  approvalNotifyEmails: z.array(z.string().email()).optional(),
  /** Oslovení v nabídce termínů (např. „Dobrý den,“). Používá se u nabídek „poslední termíny na 7 dní“. */
  slotOfferGreeting: z.string().optional(),
  /** Závěrečný text zprávy v nabídce termínů (např. „Rezervujte si v aplikaci.“). */
  slotOfferClosing: z.string().optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SettingsUpdateSchema = SettingsSchema.partial();
export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;

/** Body for sending a test email from the configured notification sender. */
export const TestEmailBodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string(),
});
export type TestEmailBody = z.infer<typeof TestEmailBodySchema>;
