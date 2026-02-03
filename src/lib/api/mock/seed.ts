/**
 * Deterministic seed data for mock API.
 * Backend: replace with migrations/seed scripts; this is for dev only.
 */
import { db } from "./mockDb";
import type { User } from "@/lib/contracts/users";
import type { Service } from "@/lib/contracts/services";
import type { Room } from "@/lib/contracts/rooms";
import type { Appointment } from "@/lib/contracts/appointments";
import type { CreditAccount, CreditTransaction } from "@/lib/contracts/credits";
import type { WaitingListEntry } from "@/lib/contracts/waitlist";
import type { Notification } from "@/lib/contracts/notifications";
import type { BehaviorEvaluationRecord } from "@/lib/contracts/admin-background";
import { addDays, subDays, setHours, setMinutes, monthKey, addMonths, startOfMonth } from "@/lib/utils/date";

function iso(date: Date): string {
  return date.toISOString();
}

export function seed(): void {
  const now = new Date();

  // Users: admin, receptionist, 3 therapists, 10 clients
  const users: User[] = [
    { id: "u-admin", email: "admin@pristav.cz", name: "Admin Admin", role: "ADMIN", active: true },
    { id: "u-rec", email: "reception@pristav.cz", name: "Recepce Nová", role: "RECEPTION", active: true },
    { id: "u-emp1", email: "terapeut1@pristav.cz", name: "Terapeut Jedna", role: "EMPLOYEE", active: true },
    { id: "u-emp2", email: "terapeut2@pristav.cz", name: "Terapeut Dva", role: "EMPLOYEE", active: true },
    { id: "u-emp3", email: "terapeut3@pristav.cz", name: "Terapeut Tři", role: "EMPLOYEE", active: true },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `u-client-${i + 1}`,
      email: `klient${i + 1}@example.cz`,
      name: `Klient ${i + 1}`,
      role: "CLIENT" as const,
      active: true,
    })),
  ];
  users.forEach((u) => db.users.set(u.id, u));

  // Services
  const services: Service[] = [
    { id: "s-1", name: "Individuální terapie", type: "INDIVIDUAL", durationMinutes: 50, priceCzk: 800, active: true },
    { id: "s-2", name: "Skupinová terapie", type: "GROUP", durationMinutes: 90, priceCzk: 400, active: true },
    { id: "s-3", name: "Vyšetření", type: "ASSESSMENT", durationMinutes: 60, priceCzk: 1200, active: true },
  ];
  services.forEach((s) => db.services.set(s.id, s));

  // Rooms
  const rooms: Room[] = [
    { id: "r-1", name: "Místnost 1", type: "THERAPY", active: true },
    { id: "r-2", name: "Místnost 2", type: "THERAPY", active: true },
    { id: "r-3", name: "Skupinová", type: "GROUP", active: true },
  ];
  rooms.forEach((r) => db.rooms.set(r.id, r));

  // Credit accounts for clients (some with balance)
  const clientIds = users.filter((u) => u.role === "CLIENT").map((u) => u.id);
  clientIds.forEach((clientId, i) => {
    const balance = i < 5 ? 2000 + i * 500 : 0;
    db.creditAccounts.set(clientId, { clientId, balanceCzk: balance, updatedAt: iso(now) });
  });

  // Sample credit transactions
  const tx1: CreditTransaction = {
    id: "tx-1",
    clientId: clientIds[0],
    amountCzk: 2000,
    reason: "Vklad",
    createdAt: iso(subDays(now, 30)),
  };
  db.creditTransactions.set(tx1.id, tx1);

  // Appointments: mix of scheduled, paid, unpaid, completed, cancelled; some unpaid >60 days
  const employees = users.filter((u) => u.role === "EMPLOYEE").map((u) => u.id);
  const s1 = services[0].id;
  const r1 = rooms[0].id;
  const appointments: Appointment[] = [];
  let appId = 1;
  // Future appointments
  for (let d = 1; d <= 14; d++) {
    const start = setMinutes(setHours(addDays(now, d), 9), 0);
    const end = setMinutes(setHours(addDays(now, d), 9), 50);
    appointments.push({
      id: `app-${appId++}`,
      clientId: clientIds[d % clientIds.length],
      employeeId: employees[d % employees.length],
      serviceId: s1,
      roomId: r1,
      startAt: iso(start),
      endAt: iso(end),
      status: "SCHEDULED",
      paymentStatus: d % 3 === 0 ? "UNPAID" : "PAID",
    });
  }
  // Old unpaid >60 days (for billing report)
  const oldDate = subDays(now, 65);
  appointments.push({
    id: `app-${appId++}`,
    clientId: clientIds[0],
    employeeId: employees[0],
    serviceId: s1,
    roomId: r1,
    startAt: iso(setMinutes(setHours(oldDate, 10), 0)),
    endAt: iso(setMinutes(setHours(oldDate, 10), 50)),
    status: "COMPLETED",
    paymentStatus: "UNPAID",
  });
  appointments.push({
    id: `app-${appId++}`,
    clientId: clientIds[1],
    employeeId: employees[0],
    serviceId: s1,
    roomId: r1,
    startAt: iso(setMinutes(setHours(subDays(now, 70), 11), 0)),
    endAt: iso(setMinutes(setHours(subDays(now, 70), 11), 50)),
    status: "COMPLETED",
    paymentStatus: "UNPAID",
  });
  // One cancelled
  appointments.push({
    id: `app-${appId++}`,
    clientId: clientIds[2],
    employeeId: employees[1],
    serviceId: s1,
    roomId: r1,
    startAt: iso(setMinutes(setHours(addDays(now, 3), 14), 0)),
    endAt: iso(setMinutes(setHours(addDays(now, 3), 14), 50)),
    status: "CANCELLED",
    paymentStatus: "REFUNDED",
    cancelReason: "Klient zrušil",
    cancelledAt: iso(now),
  });
  appointments.forEach((a) => db.appointments.set(a.id, a));

  // Waitlist entries
  const waitlistEntries: WaitingListEntry[] = [
    { id: "w-1", clientId: clientIds[2], serviceId: s1, priority: 1, notes: "Ráno", createdAt: iso(now) },
    { id: "w-2", clientId: clientIds[5], serviceId: s1, priority: 2, createdAt: iso(subDays(now, 2)) },
  ];
  waitlistEntries.forEach((w) => db.waitlist.set(w.id, w));

  // Notifications (include EMAIL/SMS for admin Communication subpage)
  const notifs: (Notification & { userId?: string })[] = [
    { id: "n-1", channel: "IN_APP", message: "Nabídka volného termínu", read: false, createdAt: iso(now) },
    { id: "n-2", channel: "IN_APP", message: "Připomínka zítřejší návštěvy", read: true, createdAt: iso(subDays(now, 1)) },
    { id: "n-3", channel: "EMAIL", message: "Vaše rezervace na 15.2.2025 v 9:00 byla potvrzena.", title: "Potvrzení termínu", userId: clientIds[0], createdAt: iso(subDays(now, 3)) },
    { id: "n-4", channel: "SMS", message: "Pristav: Připomínka – zítra 9:00 individuální terapie.", userId: clientIds[1], createdAt: iso(subDays(now, 1)) },
    { id: "n-5", channel: "EMAIL", message: "Dobrý den, máme volný termín v odpoledních hodinách. Ozvěte se.", title: "Nabídka termínu", userId: clientIds[2], createdAt: iso(subDays(now, 5)) },
  ];
  notifs.forEach((n) => db.notifications.set(n.id, n));

  // Behavior evaluation history (algorithm runs: what changed, when, why)
  const evals: BehaviorEvaluationRecord[] = [
    {
      id: "eval-1",
      clientId: clientIds[0],
      evaluatedAt: iso(subDays(now, 2)),
      previousScores: { reliabilityScore: 72, cancellationRiskScore: 15, reactivityScore: 60 },
      newScores: { reliabilityScore: 78, cancellationRiskScore: 12, reactivityScore: 65 },
      triggerEvent: "booking_completed",
      reason: "Návštěva dokončena; spolehlivost a reaktivita mírně vzrostly.",
    },
    {
      id: "eval-2",
      clientId: clientIds[2],
      evaluatedAt: iso(subDays(now, 1)),
      previousScores: { reliabilityScore: 65, cancellationRiskScore: 35 },
      newScores: { reliabilityScore: 58, cancellationRiskScore: 42 },
      triggerEvent: "booking_cancelled",
      reason: "Zrušení rezervace s refundací; zvýšené skóre rizika zrušení.",
    },
    {
      id: "eval-3",
      clientId: clientIds[5],
      evaluatedAt: iso(now),
      newScores: { reliabilityScore: 85, cancellationRiskScore: 8, reactivityScore: 70 },
      reason: "První vyhodnocení po přidání na čekací list.",
    },
  ];
  db.behaviorEvaluations.push(...evals);

  // Booking activations: enable client self-booking for therapists for current + next 2 months (dev)
  const empIds = users.filter((u) => u.role === "EMPLOYEE").map((u) => u.id);
  let m = startOfMonth(now);
  for (let i = 0; i < 3; i++) {
    const key = monthKey(m);
    empIds.forEach((id) => db.bookingActivations.set(`${id}:${key}`, true));
    m = addMonths(m, 1);
  }
}
