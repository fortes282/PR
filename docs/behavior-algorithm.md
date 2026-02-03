# Behavior Algorithm — Documentation

This document describes the behavioral scoring and tagging algorithm used to:

1. **Automatically generate behavioral tags** (e.g. Frequently Cancels, Excellent Attendance, Super Substitute).
2. **Personalize notifications** (what to send, to whom, when, how often, via which channel) to minimize spam and maximize responses.

---

## 1. Overview

- **Location:** `src/lib/behavior/`
- **Entry point:** `computeBehaviorProfile(clientId, events, options)` in `profile.ts`.
- **Data flow:** Events → Metrics → Scores → Tags + Notification strategy.

All logic is **pure** (no side effects). The app (or API) is responsible for:

- Collecting/deriving events (e.g. from appointments, notifications, waitlist).
- Storing events with a defined retention period (GDPR).
- Calling `computeBehaviorProfile` when a profile is needed (e.g. for a client overview or for waitlist suggestions).

---

## 2. Data: Behavioral Events

Events are the raw input. Each event has `id`, `clientId`, `timestamp`, and a `type` with a type-specific payload.

### 2.1 Event types (Zod schemas in `events.ts`)

| Category | Type | Description |
|----------|------|-------------|
| **Reservation** | `booking_created` | Reservation created (optional: `leadTimeHours`, `serviceId`) |
| | `booking_cancelled` | Who cancelled, reason, `hoursBeforeAppointment` |
| | `booking_rescheduled` | Appointment rescheduled |
| | `booking_no_show` | Client did not attend |
| | `booking_completed` | Appointment completed |
| | `waitlist_joined` / `waitlist_left` | Waitlist entry |
| | `substitute_offer_received` / `accepted` / `declined` | Substitute offers (optional: `responseTimeMinutes`) |
| | `slot_claimed` | Client claimed a freed slot |
| **Notifications** | `notification_sent` | Channel (PUSH/EMAIL/SMS/IN_APP), template, priority |
| | `notification_opened` | Optional: `responseTimeMinutes` |
| | `notification_clicked` | |
| | `notification_converted` | Action: booked / signed_up_substitute / confirmed; optional `responseTimeMinutes` |
| | `notification_muted` | Channel opted out |

### 2.2 Deriving events from existing data

When there is no dedicated event store, use:

- **`deriveEventsFromAppointments(appointments)`** — produces `booking_created`, `booking_completed`, `booking_no_show`, `booking_cancelled` from appointment status and timestamps.
- **`deriveEventsFromNotifications(notifications)`** — produces `notification_sent` and `notification_opened` (when `read === true`). Uses `userId` as client identifier.
- **`deriveEventsFromWaitlist(entries)`** — produces `waitlist_joined`.

Combine and sort by `timestamp` before passing to `computeBehaviorProfile`.

### 2.3 GDPR

- Collect only data with a **legitimate purpose** and a **clearly defined retention period**.
- Document retention in your privacy policy and admin configuration.

---

## 3. Metrics (from events)

Metrics are computed over a **time window** (e.g. last 30 / 90 / 180 days) with optional **recency weighting** (more recent behavior counts more).

**Function:** `computeMetrics(events, options)` in `metrics.ts`.

### 3.1 Options

| Option | Default | Description |
|--------|---------|-------------|
| `now` | `new Date()` | Reference date for the window |
| `windowDays` | `90` | 30, 90, or 180 |
| `lateCancelThresholdHours` | `12` | Cancellations with `hoursBeforeAppointment < this` count as “late cancel” |
| `recencyWeighting` | `true` | Apply recency weights |
| `recencyWeights` | `{ last30: 1.5, days31to90: 1.0, days91to180: 0.5 }` | Weights by age bucket |

### 3.2 Metric list

| Metric | Definition |
|--------|------------|
| **Reliability / Attendance** | |
| `attendanceRate` | `completedCount / scheduledCount` |
| `noShowRate` | `noShowCount / scheduledCount` |
| `lateCancelRate` | (cancellations with `hoursBefore < threshold`) / `scheduledCount` |
| `avgCancelLeadTimeHours` | Average hours before appointment when cancelled |
| **Cancellations / Changes** | |
| `cancelFrequencyPerMonth` | `cancelledCount / (windowDays/30)` |
| `rescheduleFrequencyPerMonth` | `rescheduleCount / (windowDays/30)` |
| **Responsiveness** | |
| `ctaOpenRate` | `notificationsOpenedCount / notificationsSentCount` |
| `ctaClickRate` | `notificationsClickedCount / notificationsSentCount` |
| `ctaConversionRate` | `notificationsConvertedCount / notificationsSentCount` |
| `medianResponseTimeMinutes` | Median of open/click/convert response times |
| `substituteAcceptRate` | `substituteOffersAcceptedCount / substituteOffersReceivedCount` |
| `lastMinuteFillRate` | `slotClaimedCount / substituteOffersReceivedCount` (or opportunities) |
| **Other** | |
| `avgBookingLeadTimeHours` | Average lead time when `booking_created` (optional field) |
| Raw counts | `scheduledCount`, `completedCount`, `noShowCount`, `cancelledCount`, `slotClaimedCount`, etc. |

---

## 4. Scores (0–100)

Scores are derived from metrics with configurable weights. **Function:** `computeScores(metrics, weights)` in `scores.ts`.

| Score | Meaning | Higher value |
|-------|---------|--------------|
| **ReliabilityScore** | Attendance, few no-shows, few late cancels | More reliable |
| **CancellationRiskScore** | Frequent cancels, short notice, reschedules | Higher risk |
| **ReactivityScore** | Conversion, fast response, substitute accept | More reactive to prompts |
| **FillHelperScore** | Claims freed slots, last-minute offers | Better fill-helper |
| **channelAffinity** | Per channel (PUSH, EMAIL, SMS, IN_APP) | Better affinity for that channel |

Weights are in `DEFAULT_SCORE_WEIGHTS` and can be overridden via `computeBehaviorProfile(..., { scoreWeights })`.

---

## 5. Tags (automatic behavioral labels)

Tags are assigned when metrics/scores cross **thresholds**. Each tag has:

- `name`, `tagId`
- **reason** (explainable text, e.g. “Assigned because the client cancelled 4 times less than 12 hours before the appointment in the last 30 days.”)
- `validUntil` (e.g. 90 days from now)
- `confidence` (0–1) and `strength` (low / medium / high)

**Function:** `assignTags(metrics, scores, rules, referenceDate)` in `tags.ts`.

### 5.1 Default tag rules

| Tag ID | Name | Condition (summary) |
|--------|------|---------------------|
| `frequently_cancels` | Frequently Cancels | `cancelFrequencyPerMonth ≥ 2` or `lateCancelRate > 25%` |
| `excellent_attendance` | Excellent Attendance | `attendanceRate ≥ 95%` and `noShowRate < 2%` (min 3 scheduled) |
| `last_minute_client` | Last-Minute Client | `avgBookingLeadTimeHours < 24` or `slotClaimedCount ≥ 2` |
| `super_substitute` | Super Substitute | `substituteAcceptRate ≥ 40%` and `medianResponseTime < 15 min` (min 2 offers) |
| `ignores_notifications` | Ignores Notifications | `notificationsSent ≥ 5` and open rate < 5% and conversion ≈ 0 |
| `frequently_ill` | Frequently Ill | `cancelledCount ≥ 3` and short-notice pattern |

Custom rules can be passed via `computeBehaviorProfile(..., { tagRules })`.

---

## 6. Notification strategy (personalization)

**Function:** `buildNotificationStrategy(metrics, scores, tags, options)` in `notification-strategy.ts`.

It returns:

| Field | Description |
|-------|-------------|
| `preferredChannel` | Best-performing channel for this client |
| `channelOrder` | Fallback order (e.g. PUSH → EMAIL → SMS) |
| `maxPerDay` / `maxPerWeek` | Anti-spam limits (reduced for “ignores notifications”) |
| `cooldownMinutesAfterIgnored` | Cooldown after N ignored prompts (e.g. 24h) |
| `ignoredBeforeCooldown` | N (e.g. 3) |
| `preferredHoursStart` / `preferredHoursEnd` | Preferred sending window (e.g. 18–21) |
| `sendLastMinuteOnlyToHighFillHelper` | When true, last-minute slots only to high FillHelperScore |
| `contentHint` | `short` (super substitute) / `detailed` (hesitant) / `reminder` (frequent canceller) / `standard` |

Use this object when sending notifications (targeting, channel, frequency, timing, copy).

---

## 7. Full profile: `computeBehaviorProfile`

**Signature:**

```ts
computeBehaviorProfile(
  clientId: string,
  events: BehaviorEvent[],
  options?: ComputeProfileOptions
): BehaviorProfile
```

**Returns:** `{ clientId, metrics, scores, tags, notificationStrategy, computedAt }`.

**Options:** `now`, `windowDays`, `lateCancelThresholdHours`, `recencyWeighting`, `scoreWeights`, `tagRules`, `strategyOptions`.

### 7.1 Example (derive + compute)

```ts
import {
  computeBehaviorProfile,
  deriveEventsFromAppointments,
  deriveEventsFromNotifications,
  deriveEventsFromWaitlist,
} from "@/lib/behavior";

const appointments = await api.appointments.list({ clientId });
const notifications = await api.notifications.list({ /* filter by client */ });
const waitlistEntries = (await api.waitlist.list()).filter(e => e.clientId === clientId);

const events = [
  ...deriveEventsFromAppointments(appointments),
  ...deriveEventsFromNotifications(notifications, { userIdField: "userId" }),
  ...deriveEventsFromWaitlist(waitlistEntries),
].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

const profile = computeBehaviorProfile(clientId, events, { windowDays: 90 });

console.log(profile.scores.fillHelperScore, profile.tags, profile.notificationStrategy.preferredChannel);
```

---

## 8. Integration points

- **Waitlist suggestions:** Rank clients by `fillHelperScore` (and optionally `reactivityScore`), filter by tags (e.g. exclude “ignores notifications”), use `notificationStrategy.preferredChannel` and `contentHint` when sending offers.
- **Client profile (reception/admin):** Show `profile.tags`, `profile.scores`, `profile.notificationStrategy` (recommended channel, frequency, content hint).
- **Admin configuration:** Expose tag thresholds, metric windows, score weights, and per-channel limits (see algorithm doc §8.1); persist in settings and pass into `computeBehaviorProfile` / tag rules / strategy options.
- **Event collection:** On booking created/cancelled/completed/no-show, on notification sent/opened/clicked/converted, on waitlist join/leave, on substitute offer accept/decline, on slot claimed — append the corresponding event to your event store (or derive on the fly as above).

---

## 9. File reference

| File | Purpose |
|------|---------|
| `events.ts` | Event Zod schemas and union type |
| `types.ts` | `BehaviorMetrics`, `BehaviorScores`, `TagAssignment`, `NotificationStrategy`, `BehaviorProfile` |
| `metrics.ts` | `computeMetrics(events, options)` |
| `scores.ts` | `computeScores(metrics, weights)` |
| `tags.ts` | `assignTags(metrics, scores, rules)`, default tag rules |
| `notification-strategy.ts` | `buildNotificationStrategy(metrics, scores, tags, options)` |
| `profile.ts` | `computeBehaviorProfile(clientId, events, options)` |
| `derive-events.ts` | Derive events from appointments, notifications, waitlist |
| `index.ts` | Re-exports |

---

## 10. Testing

- **Metrics:** Call `computeMetrics` with a fixed list of events and assert `attendanceRate`, `noShowRate`, `cancelFrequencyPerMonth`, etc.
- **Scores:** Call `computeScores` with known metrics and assert score ranges.
- **Tags:** Call `assignTags` with metrics that meet a tag rule and assert tag presence and `reason` string.
- **Strategy:** Call `buildNotificationStrategy` with tags like “super_substitute” or “ignores_notifications” and assert `contentHint`, `maxPerDay`, `preferredChannel`.

Future: replace heuristic weights with ML models (e.g. logistic regression / gradient boosting) once sufficient labeled data is available; keep the same public API (`computeBehaviorProfile`).
