/**
 * Shared types for metrics, scores, tags, and notification strategy.
 */

export type TimeWindowDays = 30 | 90 | 180;

/** Recency weight: events in the last 30 days count more than older ones. */
export type RecencyWeights = {
  /** Weight for events in last 30 days (default 1.5). */
  last30: number;
  /** Weight for events 31–90 days (default 1.0). */
  days31to90: number;
  /** Weight for events 91–180 days (default 0.5). */
  days91to180: number;
};

export const DEFAULT_RECENCY_WEIGHTS: RecencyWeights = {
  last30: 1.5,
  days31to90: 1.0,
  days91to180: 0.5,
};

/** Metrics derived from events over a time window (with optional recency weighting). */
export type BehaviorMetrics = {
  /** completed / scheduled */
  attendanceRate: number;
  /** no_show / scheduled */
  noShowRate: number;
  /** cancellations with hoursBefore < lateCancelThresholdHours / scheduled */
  lateCancelRate: number;
  /** average hours before appointment when cancelled */
  avgCancelLeadTimeHours: number;
  /** cancellations per month (normalized) */
  cancelFrequencyPerMonth: number;
  /** reschedules per month (normalized) */
  rescheduleFrequencyPerMonth: number;
  /** notification opened / sent */
  ctaOpenRate: number;
  /** notification clicked / sent */
  ctaClickRate: number;
  /** notification converted / sent */
  ctaConversionRate: number;
  /** median minutes from sent to open/click/convert */
  medianResponseTimeMinutes: number;
  /** substitute_offer_accepted / substitute_offer_received */
  substituteAcceptRate: number;
  /** slot_claimed count / substitute_offer_received (or opportunities) */
  lastMinuteFillRate: number;
  /** count of scheduled (created) appointments in window */
  scheduledCount: number;
  /** count of completed in window */
  completedCount: number;
  /** count of no_show in window */
  noShowCount: number;
  /** count of cancellations in window */
  cancelledCount: number;
  /** count of slot_claimed in window */
  slotClaimedCount: number;
  /** notifications sent in window */
  notificationsSentCount: number;
  /** notifications opened in window */
  notificationsOpenedCount: number;
  /** notifications converted in window */
  notificationsConvertedCount: number;
  /** substitute offers received */
  substituteOffersReceivedCount: number;
  /** substitute offers accepted */
  substituteOffersAcceptedCount: number;
  /** average booking lead time (hours) when booking_created */
  avgBookingLeadTimeHours: number;
  /** window end (reference date) */
  windowEnd: string;
  /** window length in days */
  windowDays: number;
};

/** Behavior profile scores 0–100. Higher reliability/reactivity/fillHelper is better; higher cancellationRisk is worse. */
export type BehaviorScores = {
  /** High attendance, low no-show, low late cancel → high score. */
  reliabilityScore: number;
  /** Frequent cancels, short notice, reschedules → high score (risk). */
  cancellationRiskScore: number;
  /** Conversion, fast response, substitute accept → high score. */
  reactivityScore: number;
  /** Claims freed slots, last-minute offers → high score. */
  fillHelperScore: number;
  /** Per-channel affinity 0–100. */
  channelAffinity: {
    PUSH: number;
    EMAIL: number;
    SMS: number;
    IN_APP: number;
  };
};

export type TagStrength = "low" | "medium" | "high";

/** A tag assigned from metric thresholds, with explainable reason and validity. */
export type TagAssignment = {
  tagId: string;
  name: string;
  reason: string;
  /** ISO date string; tag is valid until this date. */
  validUntil: string;
  /** 0–1 or strength. */
  confidence: number;
  strength: TagStrength;
  /** Window (e.g. 30) used to compute the metric that triggered this tag. */
  windowDays: number;
};

/** Notification personalization derived from behavior profile. */
export type NotificationStrategy = {
  /** Preferred channel for this client (best-performing). */
  preferredChannel: "PUSH" | "EMAIL" | "SMS" | "IN_APP";
  /** Fallback order if primary fails or is muted. */
  channelOrder: Array<"PUSH" | "EMAIL" | "SMS" | "IN_APP">;
  /** Max notifications per day (anti-spam). */
  maxPerDay: number;
  /** Max per week. */
  maxPerWeek: number;
  /** Cooldown in minutes after N ignored prompts (e.g. after 3 ignored, wait 24h). */
  cooldownMinutesAfterIgnored: number;
  /** Number of ignored prompts before cooldown applies. */
  ignoredBeforeCooldown: number;
  /** Preferred hour range for sending (e.g. [18, 21] for 18:00–21:00). */
  preferredHoursStart: number;
  preferredHoursEnd: number;
  /** For last-minute slots: send immediately to high fillHelperScore only. */
  sendLastMinuteOnlyToHighFillHelper: boolean;
  /** Content hint: "short" (super substitute) | "detailed" (hesitant) | "reminder" (frequent canceller). */
  contentHint: "short" | "detailed" | "reminder" | "standard";
}

export type BehaviorProfile = {
  metrics: BehaviorMetrics;
  scores: BehaviorScores;
  tags: TagAssignment[];
  notificationStrategy: NotificationStrategy;
  /** Client ID this profile was computed for. */
  clientId: string;
  /** When the profile was computed (ISO). */
  computedAt: string;
}
