/**
 * Unit tests: behavior profile (metrics, scores, tags).
 */
import {
  computeBehaviorProfile,
  deriveEventsFromAppointments,
  type BehaviorEvent,
} from "@/lib/behavior";
import type { Appointment } from "@/lib/contracts/appointments";
import { subDays } from "@/lib/utils/date";

describe("behavior profile", () => {
  const clientId = "client-1";
  const now = new Date();

  it("computes metrics from derived appointment events", () => {
    const appointments: Appointment[] = [
      {
        id: "a1",
        clientId,
        employeeId: "e1",
        serviceId: "s1",
        roomId: "r1",
        startAt: subDays(now, 10).toISOString(),
        endAt: subDays(now, 10).toISOString(),
        status: "COMPLETED",
        paymentStatus: "PAID",
      },
      {
        id: "a2",
        clientId,
        employeeId: "e1",
        serviceId: "s1",
        roomId: "r1",
        startAt: subDays(now, 5).toISOString(),
        endAt: subDays(now, 5).toISOString(),
        status: "CANCELLED",
        paymentStatus: "REFUNDED",
        cancelledAt: subDays(now, 6).toISOString(),
        cancelReason: "ill",
      },
    ];
    const events = deriveEventsFromAppointments(appointments);
    const profile = computeBehaviorProfile(clientId, events, {
      now,
      windowDays: 90,
      recencyWeighting: false,
    });

    expect(profile.metrics.scheduledCount).toBe(2);
    expect(profile.metrics.completedCount).toBe(1);
    expect(profile.metrics.cancelledCount).toBe(1);
    expect(profile.metrics.attendanceRate).toBe(0.5);
    expect(profile.clientId).toBe(clientId);
    expect(profile.scores.reliabilityScore).toBeGreaterThanOrEqual(0);
    expect(profile.scores.reliabilityScore).toBeLessThanOrEqual(100);
    expect(profile.notificationStrategy.preferredChannel).toBeDefined();
  });

  it("assigns tag when frequently cancels", () => {
    const events: BehaviorEvent[] = [];
    for (let i = 0; i < 4; i++) {
      events.push({
        id: `ev-${i}`,
        clientId,
        type: "booking_created",
        timestamp: subDays(now, 20 - i * 5).toISOString(),
        appointmentId: `a${i}`,
      });
      events.push({
        id: `ev-c-${i}`,
        clientId,
        type: "booking_cancelled",
        timestamp: subDays(now, 19 - i * 5).toISOString(),
        appointmentId: `a${i}`,
        cancelledBy: "client",
        hoursBeforeAppointment: 2,
      });
    }
    const profile = computeBehaviorProfile(clientId, events, {
      now,
      windowDays: 90,
    });
    const frequentlyCancels = profile.tags.find((t) => t.tagId === "frequently_cancels");
    expect(frequentlyCancels).toBeDefined();
    expect(frequentlyCancels?.reason).toContain("cancelled");
  });

  it("assigns excellent_attendance when high attendance and low no-show", () => {
    const events: BehaviorEvent[] = [];
    for (let i = 0; i < 5; i++) {
      events.push({
        id: `ev-${i}`,
        clientId,
        type: "booking_created",
        timestamp: subDays(now, 30 - i * 6).toISOString(),
        appointmentId: `a${i}`,
      });
      events.push({
        id: `ev-done-${i}`,
        clientId,
        type: "booking_completed",
        timestamp: subDays(now, 29 - i * 6).toISOString(),
        appointmentId: `a${i}`,
      });
    }
    const profile = computeBehaviorProfile(clientId, events, {
      now,
      windowDays: 90,
    });
    const excellent = profile.tags.find((t) => t.tagId === "excellent_attendance");
    expect(excellent).toBeDefined();
    expect(excellent?.reason).toContain("attendance");
  });
});
