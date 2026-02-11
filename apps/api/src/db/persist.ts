/**
 * Persist entities to SQLite and keep store in sync. Call from routes on every write.
 */
import type { User } from "@pristav/shared/users";
import type { Service } from "@pristav/shared/services";
import type { Room } from "@pristav/shared/rooms";
import type { Appointment } from "@pristav/shared/appointments";
import type { CreditAccount, CreditTransaction } from "@pristav/shared/credits";
import type { BillingReport } from "@pristav/shared/billing";
import type { Invoice } from "@pristav/shared/invoices";
import type { Notification, PushSubscription } from "@pristav/shared/notifications";
import type { TherapyReportFile } from "@pristav/shared/reports";
import type { WaitingListEntry } from "@pristav/shared/waitlist";
import type { Settings } from "@pristav/shared/settings";
import { eq } from "drizzle-orm";
import { getDb } from "./client.js";
import {
  users as usersTable,
  services as servicesTable,
  rooms as roomsTable,
  appointments as appointmentsTable,
  creditAccounts as creditAccountsTable,
  creditTransactions as creditTransactionsTable,
  billingReports as billingReportsTable,
  invoices as invoicesTable,
  notifications as notificationsTable,
  therapyReports as therapyReportsTable,
  therapyReportBlobs as therapyReportBlobsTable,
  waitlist as waitlistTable,
  settings as settingsTable,
  bookingActivations as bookingActivationsTable,
  pushSubscriptions as pushSubscriptionsTable,
} from "./schema.js";
import type { Store } from "../store.js";

function json<T>(v: T | undefined): string | null {
  if (v === undefined) return null;
  return JSON.stringify(v);
}

export function persistUser(store: Store, user: User): void {
  store.users.set(user.id, user);
  const db = getDb();
  db.insert(usersTable)
    .values({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone ?? null,
      active: user.active ?? true,
      createdAt: user.createdAt ?? null,
      workingHoursJson: json(user.workingHours),
      lunchBreaksJson: json(user.lunchBreaks),
      defaultPricePerSessionCzk: user.defaultPricePerSessionCzk ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      childName: user.childName ?? null,
      billingAddressJson: json(user.billingAddress),
      notificationPreferencesJson: json(user.notificationPreferences),
    })
    .onConflictDoUpdate({ target: usersTable.id, set: { email: user.email, name: user.name, role: user.role, phone: user.phone ?? null, active: user.active ?? true, createdAt: user.createdAt ?? null, workingHoursJson: json(user.workingHours), lunchBreaksJson: json(user.lunchBreaks), defaultPricePerSessionCzk: user.defaultPricePerSessionCzk ?? null, firstName: user.firstName ?? null, lastName: user.lastName ?? null, childName: user.childName ?? null, billingAddressJson: json(user.billingAddress), notificationPreferencesJson: json(user.notificationPreferences) } })
    .run();
}

export function persistService(store: Store, service: Service): void {
  store.services.set(service.id, service);
  const db = getDb();
  db.insert(servicesTable)
    .values({ id: service.id, name: service.name, type: service.type, durationMinutes: service.durationMinutes, priceCzk: service.priceCzk, active: service.active ?? true })
    .onConflictDoUpdate({ target: servicesTable.id, set: { name: service.name, type: service.type, durationMinutes: service.durationMinutes, priceCzk: service.priceCzk, active: service.active ?? true } })
    .run();
}

export function persistRoom(store: Store, room: Room): void {
  store.rooms.set(room.id, room);
  const db = getDb();
  db.insert(roomsTable)
    .values({ id: room.id, name: room.name, type: room.type, active: room.active ?? true })
    .onConflictDoUpdate({ target: roomsTable.id, set: { name: room.name, type: room.type, active: room.active ?? true } })
    .run();
}

export function persistAppointment(store: Store, appointment: Appointment): void {
  store.appointments.set(appointment.id, appointment);
  const db = getDb();
  db.insert(appointmentsTable)
    .values({
      id: appointment.id,
      clientId: appointment.clientId,
      employeeId: appointment.employeeId ?? null,
      serviceId: appointment.serviceId,
      roomId: appointment.roomId,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      internalNotes: appointment.internalNotes ?? null,
      cancelReason: appointment.cancelReason ?? null,
      cancelledAt: appointment.cancelledAt ?? null,
      blockId: appointment.blockId ?? null,
    })
    .onConflictDoUpdate({
      target: appointmentsTable.id,
      set: {
        clientId: appointment.clientId,
        employeeId: appointment.employeeId ?? null,
        serviceId: appointment.serviceId,
        roomId: appointment.roomId,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
        internalNotes: appointment.internalNotes ?? null,
        cancelReason: appointment.cancelReason ?? null,
        cancelledAt: appointment.cancelledAt ?? null,
        blockId: appointment.blockId ?? null,
      },
    })
    .run();
}

export function persistCreditAccount(store: Store, account: CreditAccount): void {
  store.creditAccounts.set(account.clientId, account);
  const db = getDb();
  db.insert(creditAccountsTable)
    .values({ clientId: account.clientId, balanceCzk: account.balanceCzk, updatedAt: account.updatedAt ?? null })
    .onConflictDoUpdate({ target: creditAccountsTable.clientId, set: { balanceCzk: account.balanceCzk, updatedAt: account.updatedAt ?? null } })
    .run();
}

export function persistCreditTransaction(store: Store, tx: CreditTransaction): void {
  store.creditTransactions.set(tx.id, tx);
  const db = getDb();
  db.insert(creditTransactionsTable)
    .values({
      id: tx.id,
      clientId: tx.clientId,
      amountCzk: tx.amountCzk,
      reason: tx.reason,
      appointmentId: tx.appointmentId ?? null,
      createdAt: tx.createdAt,
    })
    .onConflictDoUpdate({ target: creditTransactionsTable.id, set: { clientId: tx.clientId, amountCzk: tx.amountCzk, reason: tx.reason, appointmentId: tx.appointmentId ?? null, createdAt: tx.createdAt } })
    .run();
}

export function persistBillingReport(store: Store, report: BillingReport): void {
  store.billingReports.set(report.id, report);
  const db = getDb();
  db.insert(billingReportsTable)
    .values({
      id: report.id,
      periodYear: report.periodYear,
      periodMonth: report.periodMonth,
      unpaidAppointmentsJson: JSON.stringify(report.unpaidAppointments),
      totalUnpaidCzk: report.totalUnpaidCzk,
      perClientTotalsJson: JSON.stringify(report.perClientTotals),
      createdAt: report.createdAt ?? null,
    })
    .onConflictDoUpdate({
      target: billingReportsTable.id,
      set: {
        periodYear: report.periodYear,
        periodMonth: report.periodMonth,
        unpaidAppointmentsJson: JSON.stringify(report.unpaidAppointments),
        totalUnpaidCzk: report.totalUnpaidCzk,
        perClientTotalsJson: JSON.stringify(report.perClientTotals),
        createdAt: report.createdAt ?? null,
      },
    })
    .run();
}

export function persistInvoice(store: Store, invoice: Invoice): void {
  store.invoices.set(invoice.id, invoice);
  const db = getDb();
  db.insert(invoicesTable)
    .values({
      id: invoice.id,
      clientId: invoice.clientId,
      number: invoice.number,
      dueDate: invoice.dueDate,
      issueDate: invoice.issueDate,
      amountCzk: invoice.amountCzk,
      status: invoice.status,
      appointmentIdsJson: JSON.stringify(invoice.appointmentIds),
      issuerJson: json(invoice.issuer),
      recipientJson: JSON.stringify(invoice.recipient),
      createdAt: invoice.createdAt ?? null,
      sentAt: invoice.sentAt ?? null,
      paidAt: invoice.paidAt ?? null,
    })
    .onConflictDoUpdate({
      target: invoicesTable.id,
      set: {
        clientId: invoice.clientId,
        number: invoice.number,
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate,
        amountCzk: invoice.amountCzk,
        status: invoice.status,
        appointmentIdsJson: JSON.stringify(invoice.appointmentIds),
        issuerJson: json(invoice.issuer),
        recipientJson: JSON.stringify(invoice.recipient),
        createdAt: invoice.createdAt ?? null,
        sentAt: invoice.sentAt ?? null,
        paidAt: invoice.paidAt ?? null,
      },
    })
    .run();
}

export function persistNotification(store: Store, notification: Notification): void {
  store.notifications.set(notification.id, notification);
  const db = getDb();
  db.insert(notificationsTable)
    .values({
      id: notification.id,
      userId: notification.userId ?? null,
      channel: notification.channel,
      title: notification.title ?? null,
      message: notification.message,
      read: notification.read ?? false,
      createdAt: notification.createdAt,
      appointmentId: notification.appointmentId ?? null,
      blockId: notification.blockId ?? null,
    })
    .onConflictDoUpdate({
      target: notificationsTable.id,
      set: {
        userId: notification.userId ?? null,
        channel: notification.channel,
        title: notification.title ?? null,
        message: notification.message,
        read: notification.read ?? false,
        createdAt: notification.createdAt,
        appointmentId: notification.appointmentId ?? null,
        blockId: notification.blockId ?? null,
      },
    })
    .run();
}

export function persistTherapyReport(store: Store, report: TherapyReportFile): void {
  store.therapyReports.set(report.id, report);
  const db = getDb();
  db.insert(therapyReportsTable)
    .values({
      id: report.id,
      clientId: report.clientId,
      uploadedBy: report.uploadedBy,
      fileName: report.fileName,
      mimeType: report.mimeType ?? null,
      visibleToClient: report.visibleToClient ?? false,
      createdAt: report.createdAt,
    })
    .onConflictDoUpdate({
      target: therapyReportsTable.id,
      set: {
        clientId: report.clientId,
        uploadedBy: report.uploadedBy,
        fileName: report.fileName,
        mimeType: report.mimeType ?? null,
        visibleToClient: report.visibleToClient ?? false,
        createdAt: report.createdAt,
      },
    })
    .run();
}

export function persistTherapyReportBlob(store: Store, id: string, blob: Buffer): void {
  store.therapyReportBlobs.set(id, blob);
  const db = getDb();
  const base64 = blob.toString("base64");
  db.insert(therapyReportBlobsTable)
    .values({ id, blob: base64 })
    .onConflictDoUpdate({ target: therapyReportBlobsTable.id, set: { blob: base64 } })
    .run();
}

export function persistWaitlistEntry(store: Store, entry: WaitingListEntry): void {
  store.waitlist.set(entry.id, entry);
  const db = getDb();
  db.insert(waitlistTable)
    .values({
      id: entry.id,
      clientId: entry.clientId,
      serviceId: entry.serviceId,
      preferredDaysJson: json(entry.preferredDays),
      preferredTimeStart: entry.preferredTimeStart ?? null,
      preferredTimeEnd: entry.preferredTimeEnd ?? null,
      priority: entry.priority ?? null,
      notes: entry.notes ?? null,
      createdAt: entry.createdAt,
    })
    .onConflictDoUpdate({
      target: waitlistTable.id,
      set: {
        clientId: entry.clientId,
        serviceId: entry.serviceId,
        preferredDaysJson: json(entry.preferredDays),
        preferredTimeStart: entry.preferredTimeStart ?? null,
        preferredTimeEnd: entry.preferredTimeEnd ?? null,
        priority: entry.priority ?? null,
        notes: entry.notes ?? null,
        createdAt: entry.createdAt,
      },
    })
    .run();
}

export function persistSettings(store: Store, settings: Settings): void {
  Object.assign(store.settings, settings);
  const db = getDb();
  const row = {
    freeCancelHours: settings.freeCancelHours,
    businessHoursStart: settings.businessHoursStart ?? null,
    businessHoursEnd: settings.businessHoursEnd ?? null,
    invoiceNumberPrefix: settings.invoiceNumberPrefix ?? null,
    invoiceNumberNext: settings.invoiceNumberNext ?? 1,
    invoiceDueDays: settings.invoiceDueDays ?? null,
    invoiceIssuerJson: json(settings.invoiceIssuer),
    notificationEmailSenderJson: json(settings.notificationEmailSender),
    smsFaynConfigJson: json(settings.smsFaynConfig),
    reservationNotificationTimingJson: json(settings.reservationNotificationTiming),
    pushNotificationConfigJson: json(settings.pushNotificationConfig),
  };
  const existing = db.select().from(settingsTable).limit(1).all();
  if (existing.length === 0) {
    db.insert(settingsTable).values({ id: 1, ...row }).run();
  } else {
    db.update(settingsTable).set(row).where(eq(settingsTable.id, 1)).run();
  }
}

export function persistBookingActivation(store: Store, employeeId: string, monthKey: string, active: boolean): void {
  const key = `${employeeId}:${monthKey}`;
  store.bookingActivations.set(key, active);
  const db = getDb();
  db.insert(bookingActivationsTable)
    .values({ employeeId, monthKey, active })
    .onConflictDoUpdate({ target: [bookingActivationsTable.employeeId, bookingActivationsTable.monthKey], set: { active } })
    .run();
}

export function persistPushSubscription(store: Store, sub: PushSubscription): void {
  store.pushSubscriptions.set(sub.endpoint, sub);
  const db = getDb();
  const id = sub.id ?? sub.endpoint;
  db.insert(pushSubscriptionsTable)
    .values({
      id,
      userId: sub.userId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      userAgent: sub.userAgent ?? null,
      createdAt: sub.createdAt ?? new Date().toISOString(),
    })
    .onConflictDoUpdate({ target: pushSubscriptionsTable.endpoint, set: { userId: sub.userId, p256dh: sub.p256dh, auth: sub.auth, userAgent: sub.userAgent ?? null } })
    .run();
}

export function deletePushSubscription(store: Store, endpoint: string): void {
  store.pushSubscriptions.delete(endpoint);
  const db = getDb();
  db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint)).run();
}

/** Persist entire store to DB (e.g. after seed). */
export function persistAll(store: Store): void {
  for (const u of store.users.values()) persistUser(store, u);
  for (const s of store.services.values()) persistService(store, s);
  for (const r of store.rooms.values()) persistRoom(store, r);
  for (const a of store.appointments.values()) persistAppointment(store, a);
  for (const acc of store.creditAccounts.values()) persistCreditAccount(store, acc);
  for (const tx of store.creditTransactions.values()) persistCreditTransaction(store, tx);
  for (const b of store.billingReports.values()) persistBillingReport(store, b);
  for (const i of store.invoices.values()) persistInvoice(store, i);
  for (const n of store.notifications.values()) persistNotification(store, n);
  for (const r of store.therapyReports.values()) persistTherapyReport(store, r);
  for (const [id, blob] of store.therapyReportBlobs) persistTherapyReportBlob(store, id, blob);
  for (const w of store.waitlist.values()) persistWaitlistEntry(store, w);
  persistSettings(store, { ...store.settings });
  for (const [key, active] of store.bookingActivations) {
    const [employeeId, monthKey] = key.split(":");
    if (employeeId && monthKey) persistBookingActivation(store, employeeId, monthKey, active);
  }
  for (const sub of store.pushSubscriptions.values()) {
    persistPushSubscription(store, sub);
  }
}
