/**
 * Notification personalization derived from behavior profile.
 * Configures targeting, frequency, channel, timing, and content hint.
 */
import type {
  BehaviorMetrics,
  BehaviorScores,
  NotificationStrategy,
  TagAssignment,
} from "./types";

export type StrategyOptions = {
  /** Default max notifications per day (anti-spam). */
  defaultMaxPerDay?: number;
  defaultMaxPerWeek?: number;
  /** Cooldown in minutes after N ignored prompts. */
  cooldownMinutesAfterIgnored?: number;
  ignoredBeforeCooldown?: number;
  /** Default preferred hours (e.g. 18–21). */
  defaultPreferredHoursStart?: number;
  defaultPreferredHoursEnd?: number;
};

const DEFAULTS: Required<StrategyOptions> = {
  defaultMaxPerDay: 3,
  defaultMaxPerWeek: 10,
  cooldownMinutesAfterIgnored: 24 * 60,
  ignoredBeforeCooldown: 3,
  defaultPreferredHoursStart: 18,
  defaultPreferredHoursEnd: 21,
};

/**
 * Build notification strategy from metrics, scores, and tags.
 */
export function buildNotificationStrategy(
  metrics: BehaviorMetrics,
  scores: BehaviorScores,
  tags: TagAssignment[],
  options: StrategyOptions = {}
): NotificationStrategy {
  const opts = { ...DEFAULTS, ...options };

  const tagIds = new Set(tags.map((t) => t.tagId));
  const hasFrequentlyCancels = tagIds.has("frequently_cancels");
  const hasSuperSubstitute = tagIds.has("super_substitute");
  const hasIgnoresNotifications = tagIds.has("ignores_notifications");

  const channelOrder = bestChannelOrder(scores.channelAffinity);

  let maxPerDay = opts.defaultMaxPerDay;
  let maxPerWeek = opts.defaultMaxPerWeek;
  if (hasIgnoresNotifications) {
    maxPerDay = 1;
    maxPerWeek = 3;
  } else if (hasSuperSubstitute) {
    maxPerDay = Math.min(5, opts.defaultMaxPerDay + 1);
    maxPerWeek = Math.min(15, opts.defaultMaxPerWeek + 3);
  }

  let contentHint: NotificationStrategy["contentHint"] = "standard";
  if (hasSuperSubstitute) contentHint = "short";
  else if (scores.reactivityScore < 30) contentHint = "detailed";
  else if (hasFrequentlyCancels) contentHint = "reminder";

  return {
    preferredChannel: channelOrder[0],
    channelOrder,
    maxPerDay,
    maxPerWeek,
    cooldownMinutesAfterIgnored: opts.cooldownMinutesAfterIgnored,
    ignoredBeforeCooldown: opts.ignoredBeforeCooldown,
    preferredHoursStart: opts.defaultPreferredHoursStart,
    preferredHoursEnd: opts.defaultPreferredHoursEnd,
    sendLastMinuteOnlyToHighFillHelper: true,
    contentHint,
  };
}

function bestChannelOrder(
  affinity: BehaviorScores["channelAffinity"]
): Array<"PUSH" | "EMAIL" | "SMS" | "IN_APP"> {
  const entries = [
    { ch: "PUSH" as const, score: affinity.PUSH },
    { ch: "EMAIL" as const, score: affinity.EMAIL },
    { ch: "SMS" as const, score: affinity.SMS },
    { ch: "IN_APP" as const, score: affinity.IN_APP },
  ];
  entries.sort((a, b) => b.score - a.score);
  return entries.map((e) => e.ch);
}
