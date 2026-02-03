/**
 * Single entry point: compute full behavior profile from events.
 * Returns metrics, scores, tags, and notification strategy.
 */
import type { BehaviorEvent } from "./events";
import type { BehaviorProfile, TimeWindowDays } from "./types";
import { computeMetrics } from "./metrics";
import { computeScores, DEFAULT_SCORE_WEIGHTS } from "./scores";
import { assignTags } from "./tags";
import { buildNotificationStrategy } from "./notification-strategy";
import type { MetricsOptions } from "./metrics";
import type { ScoreWeights } from "./scores";
import type { TagRule } from "./tags";
import type { StrategyOptions } from "./notification-strategy";

export type ComputeProfileOptions = {
  now?: Date;
  windowDays?: TimeWindowDays;
  lateCancelThresholdHours?: number;
  recencyWeighting?: boolean;
  scoreWeights?: Partial<ScoreWeights>;
  tagRules?: TagRule[];
  strategyOptions?: StrategyOptions;
};

/**
 * Compute behavior profile for a client from their events.
 * Events should be for a single clientId and sorted by timestamp (oldest first optional).
 */
export function computeBehaviorProfile(
  clientId: string,
  events: BehaviorEvent[],
  options: ComputeProfileOptions = {}
): BehaviorProfile {
  const now = options.now ?? new Date();
  const metricsOpts: MetricsOptions = {
    now,
    windowDays: options.windowDays ?? 90,
    lateCancelThresholdHours: options.lateCancelThresholdHours ?? 12,
    recencyWeighting: options.recencyWeighting ?? true,
  };
  const metrics = computeMetrics(events, metricsOpts);
  const scoreWeights: ScoreWeights = { ...DEFAULT_SCORE_WEIGHTS, ...options.scoreWeights };
  const scores = computeScores(metrics, scoreWeights);
  const tags = assignTags(metrics, scores, options.tagRules, now);
  const notificationStrategy = buildNotificationStrategy(
    metrics,
    scores,
    tags,
    options.strategyOptions
  );

  return {
    clientId,
    metrics,
    scores,
    tags,
    notificationStrategy,
    computedAt: now.toISOString(),
  };
}
