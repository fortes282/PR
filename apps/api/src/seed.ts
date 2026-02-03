/**
 * Deterministic seed data for in-memory store (mirror of frontend mock seed).
 */
import { store } from "./store.js";
import type { User } from "@pristav/shared/users";
import type { Service } from "@pristav/shared/services";
import type { Room } from "@pristav/shared/rooms";
import type { Appointment } from "@pristav/shared/appointments";
import type { CreditTransaction } from "@pristav/shared/credits";
import type { WaitingListEntry } from "@pristav/shared/waitlist";
import type { Notification } from "@pristav/shared/notifications";
import { addDays, subDays, setHours, setMinutes, monthKey, addMonths, startOfMonth } from "./lib/date.js";

function iso(date: Date): string {
  return date.toISOString();
}

export function seed(): void {
  const now = new Date();

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
  users.forEach((u) => store.users.set(u.id, u));

  const services: Service[] = [
    { id: "s-1", name: "Individuální terapie", type: "INDIVIDUAL", durationMinutes: 50, priceCzk: 800, active: true },
    { id: "s-2", name: "Skupinová terapie", type: "GROUP", durationMinutes: 90, priceCzk: 400, active: true },
    { id: "s-3", name: "Vyšetření", type: "ASSESSMENT", durationMinutes: 60, priceCzk: 1200, active: true },
  ];
  services.forEach((s) => store.services.set(s.id, s));

  const rooms: Room[] = [
    { id: "r-1", name: "Místnost 1", type: "THERAPY", active: true },
    { id: "r-2", name: "Místnost 2", type: "THERAPY", active: true },
    { id: "r-3", name: "Skupinová", type: "GROUP", active: true },
  ];
  rooms.forEach((r) => store.rooms.set(r.id, r));

  const clientIds = users.filter((u) => u.role === "CLIENT").map((u) => u.id);
  clientIds.forEach((clientId, i) => {
    const balance = i < 5 ? 2000 + i * 500 : 0;
    store.creditAccounts.set(clientId, { clientId, balanceCzk: balance, updatedAt: iso(now) });
  });

  const tx1: CreditTransaction = {
    id: "tx-1",
    clientId: clientIds[0],
    amountCzk: 2000,
    reason: "Vklad",
    createdAt: iso(subDays(now, 30)),
  };
  store.creditTransactions.set(tx1.id, tx1);

  const employees = users.filter((u) => u.role === "EMPLOYEE").map((u) => u.id);
  const s1 = services[0].id;
  const r1 = rooms[0].id;
  const appointments: Appointment[] = [];
  let appId = 1;
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
  appointments.forEach((a) => store.appointments.set(a.id, a));

  const waitlistEntries: WaitingListEntry[] = [
    { id: "w-1", clientId: clientIds[2], serviceId: s1, priority: 1, notes: "Ráno", createdAt: iso(now) },
    { id: "w-2", clientId: clientIds[5], serviceId: s1, priority: 2, createdAt: iso(subDays(now, 2)) },
  ];
  waitlistEntries.forEach((w) => store.waitlist.set(w.id, w));

  const notifs: Notification[] = [
    { id: "n-1", channel: "IN_APP", message: "Nabídka volného termínu", read: false, createdAt: iso(now) },
    { id: "n-2", channel: "IN_APP", message: "Připomínka zítřejší návštěvy", read: true, createdAt: iso(subDays(now, 1)) },
  ];
  notifs.forEach((n) => store.notifications.set(n.id, n));

  let m = startOfMonth(now);
  for (let i = 0; i < 3; i++) {
    const key = monthKey(m);
    employees.forEach((id) => store.bookingActivations.set(`${id}:${key}`, true));
    m = addMonths(m, 1);
  }
}
