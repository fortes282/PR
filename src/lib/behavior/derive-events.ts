/**
 * Derive behavioral events from existing domain data (appointments, notifications, waitlist).
 * Use when no dedicated event store exists (e.g. mock or migration).
 * GDPR: only derive what is necessary; retention should align with source data.
 */
import type { BehaviorEvent } from "./events";
import type { Appointment } from "@/lib/contracts/appointments";
import type { Notification } from "@/lib/contracts/notifications";
import type { WaitingListEntry } from "@/lib/contracts/waitlist";

let idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

/**
 * Derive events from appointments (booking_created, booking_completed, booking_cancelled, booking_no_show).
 * Uses appointment status and timestamps; cancelled appointments need cancelledAt and optional cancelReason.
 * One booking_created per appointment (timestamp = startAt as proxy for "scheduled"); then one outcome event per appointment.
 */
export function deriveEventsFromAppointments(
  appointments: Appointment[],
  _options: { lateCancelThresholdHours?: number } = {}
): BehaviorEvent[] {
  const events: BehaviorEvent[] = [];

  for (const a of appointments) {
    const start = new Date(a.startAt);
    const clientId = a.clientId;

    events.push({
      id: nextId("ev"),
      clientId,
      type: "booking_created",
      timestamp: a.startAt,
      appointmentId: a.id,
      serviceId: a.serviceId,
    });

    if (a.status === "COMPLETED" || a.status === "PAID" || a.status === "UNPAID" || a.status === "INVOICED") {
      events.push({
        id: nextId("ev"),
        clientId,
        type: "booking_completed",
        timestamp: a.endAt ?? a.startAt,
        appointmentId: a.id,
      });
    } else if (a.status === "NO_SHOW") {
      events.push({
        id: nextId("ev"),
        clientId,
        type: "booking_no_show",
        timestamp: a.startAt,
        appointmentId: a.id,
      });
    } else if (a.status === "CANCELLED" && a.cancelledAt) {
      const cancelledAt = new Date(a.cancelledAt);
      const hoursBefore = (start.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);
      events.push({
        id: nextId("ev"),
        clientId,
        type: "booking_cancelled",
        timestamp: a.cancelledAt,
        appointmentId: a.id,
        cancelledBy: "client",
        reason: a.cancelReason ?? undefined,
        hoursBeforeAppointment: hoursBefore < 0 ? 0 : hoursBefore,
      });
    }
  }

  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Derive notification-related events from notification records.
 * Requires tracking open/click/conversion (e.g. notification.read + optional metadata).
 */
export function deriveEventsFromNotifications(
  notifications: Notification[],
  options: { userIdField?: "userId" | "clientId" } = {}
): BehaviorEvent[] {
  const events: BehaviorEvent[] = [];
  const userIdKey = options.userIdField ?? "userId";

  for (const n of notifications) {
    const clientId = (n as Notification & { userId?: string; clientId?: string })[userIdKey] ?? (n as Notification & { userId?: string }).userId;
    if (!clientId) continue;

    const channel = n.channel as "PUSH" | "EMAIL" | "SMS" | "IN_APP";
    events.push({
      id: nextId("ev"),
      clientId,
      type: "notification_sent",
      timestamp: n.createdAt,
      notificationId: n.id,
      channel,
    });

    if (n.read) {
      events.push({
        id: nextId("ev"),
        clientId,
        type: "notification_opened",
        timestamp: n.createdAt,
        notificationId: n.id,
        channel,
      });
    }
  }

  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Derive waitlist_joined events from waitlist entries.
 */
export function deriveEventsFromWaitlist(entries: WaitingListEntry[]): BehaviorEvent[] {
  return entries.map((e) => ({
    id: nextId("ev"),
    clientId: e.clientId,
    type: "waitlist_joined" as const,
    timestamp: e.createdAt,
    waitlistEntryId: e.id,
    serviceId: e.serviceId,
  }));
}
