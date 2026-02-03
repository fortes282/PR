/**
 * Metric calculation from behavioral events.
 * Metrics are computed over configurable time windows (30/90/180 days) with optional recency weighting.
 */
import type { BehaviorEvent } from "./events";
import type { BehaviorMetrics, RecencyWeights, TimeWindowDays } from "./types";
import { DEFAULT_RECENCY_WEIGHTS } from "./types";
import { subDays } from "@/lib/utils/date";
import { isEventType } from "./events";

export type MetricsOptions = {
  /** Reference date (default: now). */
  now?: Date;
  /** Window length in days (default: 90). */
  windowDays?: TimeWindowDays;
  /** Hours before appointment that counts as "late" cancel (default: 12). */
  lateCancelThresholdHours?: number;
  /** Apply recency weighting (default: true). */
  recencyWeighting?: boolean;
  recencyWeights?: RecencyWeights;
};

function getRecencyWeight(
  eventTime: Date,
  now: Date,
  weights: RecencyWeights
): number {
  const daysAgo = (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 30) return weights.last30;
  if (daysAgo <= 90) return weights.days31to90;
  if (daysAgo <= 180) return weights.days91to180;
  return 0;
}

function parseTimestamp(ts: string): Date {
  return new Date(ts);
}

/**
 * Compute behavior metrics for a single client from their events.
 * Events should be pre-filtered by clientId and sorted by timestamp.
 */
export function computeMetrics(
  events: BehaviorEvent[],
  options: MetricsOptions = {}
): BehaviorMetrics {
  const now = options.now ?? new Date();
  const windowDays = options.windowDays ?? 90;
  const lateCancelThresholdHours = options.lateCancelThresholdHours ?? 12;
  const recencyWeighting = options.recencyWeighting ?? true;
  const weights = options.recencyWeights ?? DEFAULT_RECENCY_WEIGHTS;

  const windowStart = subDays(now, windowDays);
  const windowEnd = now;

  const inWindow = (e: BehaviorEvent): boolean => {
    const t = parseTimestamp(e.timestamp);
    return t >= windowStart && t <= windowEnd;
  };

  const weight = (e: BehaviorEvent): number => {
    if (!recencyWeighting) return 1;
    return getRecencyWeight(parseTimestamp(e.timestamp), now, weights);
  };

  let scheduledCount = 0;
  let completedCount = 0;
  let noShowCount = 0;
  let cancelledCount = 0;
  let lateCancelCount = 0;
  let cancelLeadTimeSum = 0;
  let cancelLeadTimeCount = 0;
  let rescheduleCount = 0;
  let slotClaimedCount = 0;
  let notificationsSentCount = 0;
  let notificationsOpenedCount = 0;
  let notificationsClickedCount = 0;
  let notificationsConvertedCount = 0;
  let substituteOffersReceivedCount = 0;
  let substituteOffersAcceptedCount = 0;
  const responseTimeMinutes: number[] = [];
  const bookingLeadTimeHours: number[] = [];

  for (const e of events) {
    if (!inWindow(e)) continue;
    const w = weight(e);

    if (isEventType(e, "booking_created")) {
      scheduledCount += w;
      const leadTime = (e as { leadTimeHours?: number }).leadTimeHours;
      if (leadTime != null) bookingLeadTimeHours.push(leadTime);
    } else if (isEventType(e, "booking_completed")) {
      completedCount += w;
    } else if (isEventType(e, "booking_no_show")) {
      noShowCount += w;
    } else if (isEventType(e, "booking_cancelled")) {
      cancelledCount += w;
      const hoursBefore = (e as { hoursBeforeAppointment?: number }).hoursBeforeAppointment;
      if (hoursBefore != null) {
        cancelLeadTimeSum += hoursBefore * w;
        cancelLeadTimeCount += w;
        if (hoursBefore < lateCancelThresholdHours) {
          lateCancelCount += w;
        }
      }
    } else if (isEventType(e, "booking_rescheduled")) {
      rescheduleCount += w;
    } else if (isEventType(e, "slot_claimed")) {
      slotClaimedCount += w;
    } else if (isEventType(e, "notification_sent")) {
      notificationsSentCount += w;
    } else if (isEventType(e, "notification_opened")) {
      notificationsOpenedCount += w;
      const mins = (e as { responseTimeMinutes?: number }).responseTimeMinutes;
      if (mins != null) responseTimeMinutes.push(mins);
    } else if (isEventType(e, "notification_clicked")) {
      notificationsClickedCount += w;
    } else if (isEventType(e, "notification_converted")) {
      notificationsConvertedCount += w;
      const mins = (e as { responseTimeMinutes?: number }).responseTimeMinutes;
      if (mins != null) responseTimeMinutes.push(mins);
    } else if (isEventType(e, "substitute_offer_received")) {
      substituteOffersReceivedCount += w;
    } else if (isEventType(e, "substitute_offer_accepted")) {
      substituteOffersAcceptedCount += w;
      const mins = (e as { responseTimeMinutes?: number }).responseTimeMinutes;
      if (mins != null) responseTimeMinutes.push(mins);
    }
  }

  const monthsInWindow = windowDays / 30;
  const attendanceRate =
    scheduledCount > 0 ? completedCount / scheduledCount : 0;
  const noShowRate = scheduledCount > 0 ? noShowCount / scheduledCount : 0;
  const lateCancelRate =
    scheduledCount > 0 ? lateCancelCount / scheduledCount : 0;
  const avgCancelLeadTimeHours =
    cancelLeadTimeCount > 0 ? cancelLeadTimeSum / cancelLeadTimeCount : 0;
  const cancelFrequencyPerMonth = cancelledCount / monthsInWindow;
  const rescheduleFrequencyPerMonth = rescheduleCount / monthsInWindow;
  const ctaOpenRate =
    notificationsSentCount > 0
      ? notificationsOpenedCount / notificationsSentCount
      : 0;
  const ctaClickRate =
    notificationsSentCount > 0
      ? notificationsClickedCount / notificationsSentCount
      : 0;
  const ctaConversionRate =
    notificationsSentCount > 0
      ? notificationsConvertedCount / notificationsSentCount
      : 0;
  const medianResponseTimeMinutes =
    responseTimeMinutes.length > 0
      ? median(responseTimeMinutes)
      : 0;
  const substituteAcceptRate =
    substituteOffersReceivedCount > 0
      ? substituteOffersAcceptedCount / substituteOffersReceivedCount
      : 0;
  const opportunitiesSeen = substituteOffersReceivedCount;
  const lastMinuteFillRate =
    opportunitiesSeen > 0 ? slotClaimedCount / opportunitiesSeen : 0;
  const avgBookingLeadTimeHours =
    bookingLeadTimeHours.length > 0
      ? bookingLeadTimeHours.reduce((a, b) => a + b, 0) / bookingLeadTimeHours.length
      : 0;

  return {
    attendanceRate,
    noShowRate,
    lateCancelRate,
    avgCancelLeadTimeHours,
    cancelFrequencyPerMonth,
    rescheduleFrequencyPerMonth,
    ctaOpenRate,
    ctaClickRate,
    ctaConversionRate,
    medianResponseTimeMinutes,
    substituteAcceptRate,
    lastMinuteFillRate,
    scheduledCount,
    completedCount,
    noShowCount,
    cancelledCount,
    slotClaimedCount,
    notificationsSentCount,
    notificationsOpenedCount,
    notificationsConvertedCount,
    substituteOffersReceivedCount,
    substituteOffersAcceptedCount,
    avgBookingLeadTimeHours,
    windowEnd: windowEnd.toISOString(),
    windowDays,
  };
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
