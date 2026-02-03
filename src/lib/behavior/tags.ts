/**
 * Automatic behavioral tags from metric thresholds.
 * Each tag has name, reason (explainable), validity period, and confidence/strength.
 */
import type { BehaviorMetrics, BehaviorScores, TagAssignment, TagStrength } from "./types";
import { addDays } from "@/lib/utils/date";

export type TagRule = {
  tagId: string;
  name: string;
  /** Returns reason if tag applies, else null. */
  check: (metrics: BehaviorMetrics, scores: BehaviorScores) => string | null;
  /** Validity in days from now (e.g. 90). */
  validityDays: number;
  /** Confidence 0–1 or strength. */
  strength: TagStrength;
};

const TAG_FREQUENTLY_CANCELS: TagRule = {
  tagId: "frequently_cancels",
  name: "Frequently Cancels",
  check: (m) => {
    if (m.cancelFrequencyPerMonth >= 2) {
      return `Assigned because the client cancelled ${m.cancelledCount} time(s) in the last ${m.windowDays} days (≥2 per month).`;
    }
    if (m.lateCancelRate > 0.25 && m.scheduledCount > 0) {
      return `Assigned because late cancellation rate (within 12h) is ${(m.lateCancelRate * 100).toFixed(0)}% in the last ${m.windowDays} days.`;
    }
    return null;
  },
  validityDays: 90,
  strength: "medium",
};

const TAG_EXCELLENT_ATTENDANCE: TagRule = {
  tagId: "excellent_attendance",
  name: "Excellent Attendance",
  check: (m) => {
    if (m.attendanceRate >= 0.95 && m.noShowRate < 0.02 && m.scheduledCount >= 3) {
      return `Assigned because attendance rate is ${(m.attendanceRate * 100).toFixed(0)}% and no-show rate is ${(m.noShowRate * 100).toFixed(0)}% over the last ${m.windowDays} days.`;
    }
    return null;
  },
  validityDays: 90,
  strength: "high",
};

const TAG_LAST_MINUTE_CLIENT: TagRule = {
  tagId: "last_minute_client",
  name: "Last-Minute Client",
  check: (m) => {
    if (m.avgBookingLeadTimeHours < 24 && m.scheduledCount >= 1) {
      return `Assigned because average booking lead time is ${m.avgBookingLeadTimeHours.toFixed(0)} hours in the last ${m.windowDays} days.`;
    }
    if (m.slotClaimedCount >= 2) {
      return `Assigned because the client claimed ${m.slotClaimedCount} freed slot(s) in the last ${m.windowDays} days.`;
    }
    return null;
  },
  validityDays: 90,
  strength: "medium",
};

const TAG_SUPER_SUBSTITUTE: TagRule = {
  tagId: "super_substitute",
  name: "Super Substitute",
  check: (m) => {
    if (
      m.substituteOffersReceivedCount >= 2 &&
      m.substituteAcceptRate >= 0.4 &&
      m.medianResponseTimeMinutes < 15
    ) {
      return `Assigned because substitute accept rate is ${(m.substituteAcceptRate * 100).toFixed(0)}% and median response time is ${m.medianResponseTimeMinutes} minutes in the last ${m.windowDays} days.`;
    }
    return null;
  },
  validityDays: 90,
  strength: "high",
};

const TAG_IGNORES_NOTIFICATIONS: TagRule = {
  tagId: "ignores_notifications",
  name: "Ignores Notifications",
  check: (m) => {
    if (
      m.notificationsSentCount >= 5 &&
      m.ctaOpenRate < 0.05 &&
      m.ctaConversionRate < 0.05
    ) {
      return `Assigned because open rate is ${(m.ctaOpenRate * 100).toFixed(0)}% and conversion rate is ${(m.ctaConversionRate * 100).toFixed(0)}% after ${m.notificationsSentCount} notifications in the last ${m.windowDays} days.`;
    }
    return null;
  },
  validityDays: 90,
  strength: "medium",
};

const TAG_FREQUENTLY_ILL: TagRule = {
  tagId: "frequently_ill",
  name: "Frequently Ill",
  check: (m) => {
    if (m.cancelledCount >= 3 && m.avgCancelLeadTimeHours < 24) {
      return `Assigned because the client had ${m.cancelledCount} short-notice cancellation(s) in the last ${m.windowDays} days (possible illness pattern).`;
    }
    return null;
  },
  validityDays: 90,
  strength: "low",
};

export const DEFAULT_TAG_RULES: TagRule[] = [
  TAG_FREQUENTLY_CANCELS,
  TAG_EXCELLENT_ATTENDANCE,
  TAG_LAST_MINUTE_CLIENT,
  TAG_SUPER_SUBSTITUTE,
  TAG_IGNORES_NOTIFICATIONS,
  TAG_FREQUENTLY_ILL,
];

function confidenceFromStrength(s: TagStrength): number {
  switch (s) {
    case "high":
      return 0.9;
    case "medium":
      return 0.7;
    case "low":
      return 0.5;
    default:
      return 0.6;
  }
}

/**
 * Assign tags from metrics and scores using the given rules.
 */
export function assignTags(
  metrics: BehaviorMetrics,
  scores: BehaviorScores,
  rules: TagRule[] = DEFAULT_TAG_RULES,
  referenceDate: Date = new Date()
): TagAssignment[] {
  const result: TagAssignment[] = [];
  for (const rule of rules) {
    const reason = rule.check(metrics, scores);
    if (reason) {
      const validUntil = addDays(referenceDate, rule.validityDays);
      result.push({
        tagId: rule.tagId,
        name: rule.name,
        reason,
        validUntil: validUntil.toISOString().slice(0, 10),
        confidence: confidenceFromStrength(rule.strength),
        strength: rule.strength,
        windowDays: metrics.windowDays,
      });
    }
  }
  return result;
}
