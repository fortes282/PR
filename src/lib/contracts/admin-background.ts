/**
 * Types for Admin Background: algorithm evaluations, sent communications, recommendations.
 */

import type { BehaviorScores } from "@/lib/behavior/types";

/** Single run of behavior profile evaluation: what changed, when, why. */
export type BehaviorEvaluationRecord = {
  id: string;
  clientId: string;
  /** When the evaluation was run (ISO). */
  evaluatedAt: string;
  /** Previous scores (optional; absent on first run). */
  previousScores?: Partial<BehaviorScores>;
  /** New scores after this run. */
  newScores: Partial<BehaviorScores>;
  /** Event or trigger that caused re-evaluation (e.g. "booking_completed", "booking_cancelled"). */
  triggerEvent?: string;
  /** Human-readable reason (e.g. "Appointment completed; reliability score increased"). */
  reason: string;
};

/** Sent email or SMS for Communication subpage. */
export type SentCommunication = {
  id: string;
  channel: "EMAIL" | "SMS";
  recipientId: string;
  recipientName: string;
  /** When sent (ISO). */
  sentAt: string;
  subject?: string;
  messageText: string;
};

export type SentCommunicationListParams = {
  recipientName?: string;
  /** Filter by sent time range (ISO). */
  from?: string;
  to?: string;
  messageText?: string;
};

/** Recommendation type for occupancy/revenue. */
export type RecommendationType =
  | "INACTIVE_CALL"
  | "WAITLIST_FOLLOW_UP"
  | "CANCELLATION_RISK_REMINDER"
  | "NO_SHOW_FOLLOW_UP"
  | "REENGAGE_AFTER_REFUND"
  | "UPSELL_GROUP"
  | "SLOT_FILL_OFFER"
  | "REMINDER_UPCOMING"
  | "REBOOK_AFTER_COMPLETED";

export type ClientRecommendation = {
  id: string;
  clientId: string;
  clientName: string;
  type: RecommendationType;
  reason: string;
  /** 1 = highest priority. */
  priority: number;
  suggestedAction: string;
  /** Optional: related entity (e.g. waitlist entry id, appointment id). */
  relatedId?: string;
};
