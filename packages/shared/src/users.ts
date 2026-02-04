import { z } from "zod";
import { Role } from "./auth";

export const WorkingHoursSlotSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  start: z.string(),
  end: z.string(),
});
export type WorkingHoursSlot = z.infer<typeof WorkingHoursSlotSchema>;

export const LunchBreakSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  start: z.string(),
  end: z.string(),
});
export type LunchBreak = z.infer<typeof LunchBreakSchema>;

export const BillingAddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zip: z.string(),
  country: z.string().default("CZ"),
});
export type BillingAddress = z.infer<typeof BillingAddressSchema>;

/** Granular client notification preferences (opt-in/opt-out per channel and type). */
export const NotificationPreferencesSchema = z.object({
  /** First reservation reminder by email (hours before – uses admin default if not set). */
  emailReminder1: z.boolean().default(true),
  /** Second reservation reminder by email. */
  emailReminder2: z.boolean().default(true),
  /** Reservation reminder by SMS. */
  smsReminder: z.boolean().default(false),
  /** Marketing / news emails. */
  emailMarketing: z.boolean().default(false),
  /** Marketing SMS. */
  smsMarketing: z.boolean().default(false),
  /** Push: appointment reminders. */
  pushAppointmentReminder: z.boolean().default(true),
  /** Push: marketing / general. */
  pushMarketing: z.boolean().default(false),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: Role,
  phone: z.string().optional(),
  active: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  workingHours: z.array(WorkingHoursSlotSchema).optional(),
  lunchBreaks: z.array(LunchBreakSchema).optional(),
  defaultPricePerSessionCzk: z.number().min(0).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  childName: z.string().optional(),
  billingAddress: BillingAddressSchema.optional(),
  notificationPreferences: NotificationPreferencesSchema.optional(),
});
export type User = z.infer<typeof UserSchema>;

export const UserUpdateSchema = UserSchema.partial().omit({ id: true });
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export const UserListParamsSchema = z.object({
  role: Role.optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});
export type UserListParams = z.infer<typeof UserListParamsSchema>;
