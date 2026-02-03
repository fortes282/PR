/**
 * Recommendations for admin: actions to maximize occupancy and revenue.
 * Consumes appointments, waitlist, users, notifications; outputs prioritized ClientRecommendation[].
 */
import type { User } from "@/lib/contracts/users";
import type { Appointment } from "@/lib/contracts/appointments";
import type { WaitingListEntry } from "@/lib/contracts/waitlist";
import type { ClientRecommendation, RecommendationType } from "@/lib/contracts/admin-background";
import { subDays } from "@/lib/utils/date";

const DAYS_INACTIVE_THRESHOLD = 60;
const DAYS_AFTER_REFUND_REENGAGE = 30;
const DAYS_UPCOMING_REMINDER = 2;

export type RecommendationInput = {
  users: User[];
  appointments: Appointment[];
  waitlist: WaitingListEntry[];
  now?: Date;
};

let idCounter = 0;
function nextId(): string {
  return `rec-${Date.now()}-${++idCounter}`;
}

function getClients(users: User[]): User[] {
  return users.filter((u) => u.role === "CLIENT");
}

/** Last completed/paid appointment end time per client. */
function getLastVisitByClient(appointments: Appointment[], now: Date): Map<string, Date> {
  const byClient = new Map<string, Date>();
  for (const a of appointments) {
    if (
      a.status === "COMPLETED" ||
      a.status === "PAID" ||
      a.status === "INVOICED" ||
      a.status === "UNPAID"
    ) {
      const end = new Date(a.endAt);
      if (end > now) continue;
      const cur = byClient.get(a.clientId);
      if (!cur || end > cur) byClient.set(a.clientId, end);
    }
  }
  return byClient;
}

/** Clients who had a refund (cancelled with REFUNDED) in the last N days. */
function getRecentRefunds(appointments: Appointment[], now: Date, days: number): Set<string> {
  const since = subDays(now, days);
  const set = new Set<string>();
  for (const a of appointments) {
    if (a.paymentStatus === "REFUNDED" && a.cancelledAt) {
      const cancelled = new Date(a.cancelledAt);
      if (cancelled >= since) set.add(a.clientId);
    }
  }
  return set;
}

/** Last outcome per client: no_show if last was NO_SHOW. */
function getLastNoShowClients(appointments: Appointment[], now: Date): Set<string> {
  const byClient = new Map<string, { end: Date; noShow: boolean }>();
  for (const a of appointments) {
    const end = new Date(a.endAt);
    if (end > now) continue;
    const cur = byClient.get(a.clientId);
    if (!cur || end > cur.end) {
      byClient.set(a.clientId, { end, noShow: a.status === "NO_SHOW" });
    }
  }
  const noShow = new Set<string>();
  byClient.forEach((v, k) => {
    if (v.noShow) noShow.add(k);
  });
  return noShow;
}

/** Clients with upcoming appointment in next N days (for reminder). */
function getUpcomingAppointmentClients(
  appointments: Appointment[],
  now: Date,
  days: number
): Set<string> {
  const until = new Date(now);
  until.setDate(until.getDate() + days);
  const set = new Set<string>();
  for (const a of appointments) {
    if (a.status !== "SCHEDULED" && a.status !== "PAID" && a.status !== "UNPAID") continue;
    const start = new Date(a.startAt);
    if (start >= now && start <= until) set.add(a.clientId);
  }
  return set;
}

/** Count completed individual vs group (by service type) per client. */
function getIndividualVsGroupCounts(
  appointments: Appointment[],
  serviceIdsIndividual: Set<string>
): Map<string, { individual: number; group: number }> {
  const byClient = new Map<string, { individual: number; group: number }>();
  for (const a of appointments) {
    if (
      a.status !== "COMPLETED" &&
      a.status !== "PAID" &&
      a.status !== "INVOICED" &&
      a.status !== "UNPAID"
    )
      continue;
    const cur = byClient.get(a.clientId) ?? { individual: 0, group: 0 };
    if (serviceIdsIndividual.has(a.serviceId)) cur.individual += 1;
    else cur.group += 1;
    byClient.set(a.clientId, cur);
  }
  return byClient;
}

export function computeRecommendations(input: RecommendationInput): ClientRecommendation[] {
  const now = input.now ?? new Date();
  const clients = getClients(input.users);
  const lastVisit = getLastVisitByClient(input.appointments, now);
  const recentRefunds = getRecentRefunds(input.appointments, now, DAYS_AFTER_REFUND_REENGAGE);
  const lastNoShow = getLastNoShowClients(input.appointments, now);
  const upcoming = getUpcomingAppointmentClients(input.appointments, now, DAYS_UPCOMING_REMINDER);
  const waitlistByClient = new Map<string, WaitingListEntry>();
  for (const w of input.waitlist) {
    waitlistByClient.set(w.clientId, w);
  }
  const serviceIdsIndividual = new Set(["s-1"]); // default individual service id from seed
  const individualVsGroup = getIndividualVsGroupCounts(
    input.appointments,
    serviceIdsIndividual
  );

  const result: ClientRecommendation[] = [];

  for (const client of clients) {
    const last = lastVisit.get(client.id);
    const daysSinceVisit = last
      ? (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;
    const onWaitlist = waitlistByClient.get(client.id);
    const hadRefund = recentRefunds.has(client.id);
    const hadNoShow = lastNoShow.has(client.id);
    const hasUpcoming = upcoming.has(client.id);
    const counts = individualVsGroup.get(client.id) ?? { individual: 0, group: 0 };

    // 1) Inactive long time → call (high impact on occupancy)
    if (daysSinceVisit >= DAYS_INACTIVE_THRESHOLD && daysSinceVisit < 365) {
      result.push({
        id: nextId(),
        clientId: client.id,
        clientName: client.name,
        type: "INACTIVE_CALL",
        reason: `Klient nebyl ${Math.floor(daysSinceVisit)} dní; volné sloty lze nabídnout.`,
        priority: 1,
        suggestedAction: "Zavolat klientovi a nabídnout termín.",
      });
    }

    // 2) On waitlist → follow up (fill slots)
    if (onWaitlist) {
      result.push({
        id: nextId(),
        clientId: client.id,
        clientName: client.name,
        type: "WAITLIST_FOLLOW_UP",
        reason: "Klient je na čekacím listu; při uvolnění slotu nabídnout.",
        priority: 2,
        suggestedAction: "Při uvolnění vhodného termínu kontaktovat (e-mail nebo SMS).",
        relatedId: onWaitlist.id,
      });
    }

    // 3) No-show last time → call to rebook
    if (hadNoShow) {
      result.push({
        id: nextId(),
        clientId: client.id,
        clientName: client.name,
        type: "NO_SHOW_FOLLOW_UP",
        reason: "Klient se naposledy nedostavil; nabídnout nový termín.",
        priority: 2,
        suggestedAction: "Zavolat a domluvit novou rezervaci.",
      });
    }

    // 4) Refund in last 30 days → re-engage
    if (hadRefund) {
      result.push({
        id: nextId(),
        clientId: client.id,
        clientName: client.name,
        type: "REENGAGE_AFTER_REFUND",
        reason: "V nedávné době zrušil s refundací; vhodné znovu nabídnout termín.",
        priority: 3,
        suggestedAction: "E-mail nebo hovor s nabídkou nového termínu.",
      });
    }

    // 5) Many individual sessions, no group → upsell group (revenue + occupancy)
    if (counts.individual >= 5 && counts.group === 0) {
      result.push({
        id: nextId(),
        clientId: client.id,
        clientName: client.name,
        type: "UPSELL_GROUP",
        reason: "Pravidelný klient individuální terapie; skupinová terapie může zvýšit vytíženost.",
        priority: 3,
        suggestedAction: "Nabídnout skupinovou terapii (informační e-mail nebo při příští návštěvě).",
      });
    }

    // 6) Upcoming appointment in 2 days → reminder (reduce no-show)
    if (hasUpcoming) {
      result.push({
        id: nextId(),
        clientId: client.id,
        clientName: client.name,
        type: "REMINDER_UPCOMING",
        reason: "Blížící se termín; připomínka snižuje no-show.",
        priority: 4,
        suggestedAction: "Odeslat SMS nebo e-mail s připomínkou termínu.",
      });
    }

    // 7) Recently completed → rebook next (fill future slots)
    if (last && daysSinceVisit >= 7 && daysSinceVisit <= 45) {
      result.push({
        id: nextId(),
        clientId: client.id,
        clientName: client.name,
        type: "REBOOK_AFTER_COMPLETED",
        reason: "Poslední návštěva před více než týdnem; vhodné nabídnout další termín.",
        priority: 4,
        suggestedAction: "E-mail nebo in-app zpráva s odkazem na rezervaci.",
      });
    }
  }

  // Sort by priority (1 first), then by client name
  result.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.clientName.localeCompare(b.clientName);
  });

  return result;
}
