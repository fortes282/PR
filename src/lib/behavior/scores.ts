/**
 * Behavior profile scores (0–100) derived from metrics.
 * Heuristic-based; can later be replaced by ML models (e.g. logistic regression).
 */
import type { BehaviorMetrics, BehaviorScores } from "./types";

export type ScoreWeights = {
  /** Reliability: weight for attendance (default 40), no_show penalty (default -30), late_cancel penalty (default -20). */
  reliabilityAttendance: number;
  reliabilityNoShowPenalty: number;
  reliabilityLateCancelPenalty: number;
  /** Cancellation risk: weight for cancel frequency and short lead time. */
  cancellationRiskFrequency: number;
  cancellationRiskShortNotice: number;
  /** Reactivity: conversion, fast response, substitute accept. */
  reactivityConversion: number;
  reactivityResponseTime: number;
  reactivitySubstituteAccept: number;
  /** Fill helper: slot claimed, last-minute fill rate. */
  fillHelperSlotClaimed: number;
  fillHelperLastMinuteRate: number;
};

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  reliabilityAttendance: 40,
  reliabilityNoShowPenalty: -30,
  reliabilityLateCancelPenalty: -20,
  cancellationRiskFrequency: 25,
  cancellationRiskShortNotice: 25,
  reactivityConversion: 40,
  reactivityResponseTime: 30,
  reactivitySubstituteAccept: 30,
  fillHelperSlotClaimed: 50,
  fillHelperLastMinuteRate: 50,
};

/**
 * Compute reliability score (0–100). Higher = more reliable (attends, few no-shows, few late cancels).
 */
function reliabilityScore(m: BehaviorMetrics, w: ScoreWeights): number {
  const att = Math.min(1, m.attendanceRate) * w.reliabilityAttendance;
  const noShow = Math.min(1, m.noShowRate) * Math.abs(w.reliabilityNoShowPenalty);
  const late = Math.min(1, m.lateCancelRate) * Math.abs(w.reliabilityLateCancelPenalty);
  const raw = 50 + att + noShow * -1 + late * -1;
  return clamp(0, 100, Math.round(raw));
}

/**
 * Compute cancellation risk score (0–100). Higher = more risk (frequent cancels, short notice, reschedules).
 */
function cancellationRiskScore(m: BehaviorMetrics, w: ScoreWeights): number {
  const freq = Math.min(2, m.cancelFrequencyPerMonth) / 2; // 2+/month = max
  const shortNotice = m.avgCancelLeadTimeHours < 24 ? 1 - m.avgCancelLeadTimeHours / 24 : 0;
  const resched = Math.min(1, m.rescheduleFrequencyPerMonth / 2);
  const raw =
    freq * w.cancellationRiskFrequency +
    shortNotice * w.cancellationRiskShortNotice +
    resched * 25;
  return clamp(0, 100, Math.round(raw));
}

/**
 * Compute reactivity score (0–100). Higher = responds well to notifications and substitute offers.
 */
function reactivityScore(m: BehaviorMetrics, w: ScoreWeights): number {
  const conversion = m.ctaConversionRate * w.reactivityConversion;
  const response =
    m.medianResponseTimeMinutes <= 0
      ? 0
      : m.medianResponseTimeMinutes < 15
        ? w.reactivityResponseTime
        : m.medianResponseTimeMinutes < 60
          ? w.reactivityResponseTime * 0.5
          : 0;
  const substitute = m.substituteAcceptRate * w.reactivitySubstituteAccept;
  const raw = conversion + response + substitute;
  return clamp(0, 100, Math.round(raw));
}

/**
 * Compute fill-helper score (0–100). Higher = good at claiming freed slots / last-minute offers.
 */
function fillHelperScore(m: BehaviorMetrics, w: ScoreWeights): number {
  const claimed = Math.min(5, m.slotClaimedCount) * (w.fillHelperSlotClaimed / 5);
  const rate = m.lastMinuteFillRate * w.fillHelperLastMinuteRate;
  const raw = claimed + rate;
  return clamp(0, 100, Math.round(raw));
}

/**
 * Channel affinity (0–100) per channel. Requires events broken down by channel; here we use global open/click/conversion
 * as a proxy when channel-specific data is not available (single score for all channels).
 */
function channelAffinityFromMetrics(m: BehaviorMetrics): BehaviorScores["channelAffinity"] {
  const base = (m.ctaOpenRate * 0.3 + m.ctaClickRate * 0.3 + m.ctaConversionRate * 0.4) * 100;
  return {
    PUSH: clamp(0, 100, Math.round(base)),
    EMAIL: clamp(0, 100, Math.round(base)),
    SMS: clamp(0, 100, Math.round(base)),
    IN_APP: clamp(0, 100, Math.round(base)),
  };
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeScores(
  metrics: BehaviorMetrics,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): BehaviorScores {
  return {
    reliabilityScore: reliabilityScore(metrics, weights),
    cancellationRiskScore: cancellationRiskScore(metrics, weights),
    reactivityScore: reactivityScore(metrics, weights),
    fillHelperScore: fillHelperScore(metrics, weights),
    channelAffinity: channelAffinityFromMetrics(metrics),
  };
}
