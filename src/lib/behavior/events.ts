/**
 * Behavioral telemetry events.
 * GDPR: collect only with legitimate purpose and defined retention period.
 */
import { z } from "zod";

const BaseEventSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  timestamp: z.string().datetime(),
});

// A) Reservation-related
export const BookingCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal("booking_created"),
  appointmentId: z.string(),
  serviceId: z.string().optional(),
  leadTimeHours: z.number().optional(),
});

export const BookingCancelledEventSchema = BaseEventSchema.extend({
  type: z.literal("booking_cancelled"),
  appointmentId: z.string(),
  cancelledBy: z.enum(["client", "reception", "system"]),
  reason: z.string().optional(),
  hoursBeforeAppointment: z.number().optional(),
});

export const BookingRescheduledEventSchema = BaseEventSchema.extend({
  type: z.literal("booking_rescheduled"),
  appointmentId: z.string(),
  previousStartAt: z.string().datetime().optional(),
});

export const BookingNoShowEventSchema = BaseEventSchema.extend({
  type: z.literal("booking_no_show"),
  appointmentId: z.string(),
});

export const BookingCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal("booking_completed"),
  appointmentId: z.string(),
});

export const WaitlistJoinedEventSchema = BaseEventSchema.extend({
  type: z.literal("waitlist_joined"),
  waitlistEntryId: z.string(),
  serviceId: z.string().optional(),
});

export const WaitlistLeftEventSchema = BaseEventSchema.extend({
  type: z.literal("waitlist_left"),
  waitlistEntryId: z.string(),
});

export const SubstituteOfferReceivedEventSchema = BaseEventSchema.extend({
  type: z.literal("substitute_offer_received"),
  offerId: z.string(),
  appointmentId: z.string().optional(),
});

export const SubstituteOfferAcceptedEventSchema = BaseEventSchema.extend({
  type: z.literal("substitute_offer_accepted"),
  offerId: z.string(),
  responseTimeMinutes: z.number().optional(),
});

export const SubstituteOfferDeclinedEventSchema = BaseEventSchema.extend({
  type: z.literal("substitute_offer_declined"),
  offerId: z.string(),
});

export const SlotClaimedEventSchema = BaseEventSchema.extend({
  type: z.literal("slot_claimed"),
  appointmentId: z.string(),
  freedAt: z.string().datetime().optional(),
});

// B) Notification / prompt responses
export const NotificationSentEventSchema = BaseEventSchema.extend({
  type: z.literal("notification_sent"),
  notificationId: z.string(),
  channel: z.enum(["PUSH", "EMAIL", "SMS", "IN_APP"]),
  template: z.string().optional(),
  priority: z.number().optional(),
});

export const NotificationOpenedEventSchema = BaseEventSchema.extend({
  type: z.literal("notification_opened"),
  notificationId: z.string(),
  channel: z.enum(["PUSH", "EMAIL", "SMS", "IN_APP"]),
  responseTimeMinutes: z.number().optional(),
});

export const NotificationClickedEventSchema = BaseEventSchema.extend({
  type: z.literal("notification_clicked"),
  notificationId: z.string(),
  channel: z.enum(["PUSH", "EMAIL", "SMS", "IN_APP"]),
});

export const NotificationConvertedEventSchema = BaseEventSchema.extend({
  type: z.literal("notification_converted"),
  notificationId: z.string(),
  channel: z.enum(["PUSH", "EMAIL", "SMS", "IN_APP"]),
  action: z.enum(["booked", "signed_up_substitute", "confirmed"]).optional(),
  responseTimeMinutes: z.number().optional(),
});

export const NotificationMutedEventSchema = BaseEventSchema.extend({
  type: z.literal("notification_muted"),
  channel: z.string().optional(),
});

export const BehaviorEventSchema = z.discriminatedUnion("type", [
  BookingCreatedEventSchema,
  BookingCancelledEventSchema,
  BookingRescheduledEventSchema,
  BookingNoShowEventSchema,
  BookingCompletedEventSchema,
  WaitlistJoinedEventSchema,
  WaitlistLeftEventSchema,
  SubstituteOfferReceivedEventSchema,
  SubstituteOfferAcceptedEventSchema,
  SubstituteOfferDeclinedEventSchema,
  SlotClaimedEventSchema,
  NotificationSentEventSchema,
  NotificationOpenedEventSchema,
  NotificationClickedEventSchema,
  NotificationConvertedEventSchema,
  NotificationMutedEventSchema,
]);

export type BehaviorEvent = z.infer<typeof BehaviorEventSchema>;

export function isEventType<E extends BehaviorEvent>(
  event: BehaviorEvent,
  type: E["type"]
): event is E {
  return event.type === type;
}
