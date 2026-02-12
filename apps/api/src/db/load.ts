/**
 * Load all data from SQLite into in-memory store. Call after migrations on startup.
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

function parseJson<T>(s: string | null): T | undefined {
  if (s == null) return undefined;
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}

export function loadFromDbIntoStore(store: Store): void {
  const db = getDb();

  const userRows = db.select().from(usersTable).all();
  store.users.clear();
  for (const r of userRows) {
    const u: User = {
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role as User["role"],
      phone: r.phone ?? undefined,
      active: r.active ?? true,
      createdAt: r.createdAt ?? undefined,
      workingHours: parseJson(r.workingHoursJson),
      lunchBreaks: parseJson(r.lunchBreaksJson),
      defaultPricePerSessionCzk: r.defaultPricePerSessionCzk ?? undefined,
      firstName: r.firstName ?? undefined,
      lastName: r.lastName ?? undefined,
      childName: r.childName ?? undefined,
      billingAddress: parseJson(r.billingAddressJson),
      notificationPreferences: parseJson(r.notificationPreferencesJson),
    };
    store.users.set(u.id, u);
  }

  const serviceRows = db.select().from(servicesTable).all();
  store.services.clear();
  for (const r of serviceRows) {
    store.services.set(r.id, {
      id: r.id,
      name: r.name,
      type: r.type as Service["type"],
      durationMinutes: r.durationMinutes,
      priceCzk: r.priceCzk,
      active: r.active ?? true,
    });
  }

  const roomRows = db.select().from(roomsTable).all();
  store.rooms.clear();
  for (const r of roomRows) {
    store.rooms.set(r.id, {
      id: r.id,
      name: r.name,
      type: r.type as Room["type"],
      active: r.active ?? true,
    });
  }

  const appointmentRows = db.select().from(appointmentsTable).all();
  store.appointments.clear();
  for (const r of appointmentRows) {
    store.appointments.set(r.id, {
      id: r.id,
      clientId: r.clientId,
      employeeId: r.employeeId ?? undefined,
      serviceId: r.serviceId,
      roomId: r.roomId,
      startAt: r.startAt,
      endAt: r.endAt,
      status: r.status as Appointment["status"],
      paymentStatus: r.paymentStatus as Appointment["paymentStatus"],
      internalNotes: r.internalNotes ?? undefined,
      cancelReason: r.cancelReason ?? undefined,
      cancelledAt: r.cancelledAt ?? undefined,
      blockId: r.blockId ?? undefined,
    });
  }

  const accountRows = db.select().from(creditAccountsTable).all();
  store.creditAccounts.clear();
  for (const r of accountRows) {
    store.creditAccounts.set(r.clientId, {
      clientId: r.clientId,
      balanceCzk: r.balanceCzk,
      updatedAt: r.updatedAt ?? undefined,
    });
  }

  const txRows = db.select().from(creditTransactionsTable).all();
  store.creditTransactions.clear();
  for (const r of txRows) {
    store.creditTransactions.set(r.id, {
      id: r.id,
      clientId: r.clientId,
      amountCzk: r.amountCzk,
      reason: r.reason,
      appointmentId: r.appointmentId ?? undefined,
      createdAt: r.createdAt,
    });
  }

  const billingRows = db.select().from(billingReportsTable).all();
  store.billingReports.clear();
  for (const r of billingRows) {
    store.billingReports.set(r.id, {
      id: r.id,
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      unpaidAppointments: parseJson(r.unpaidAppointmentsJson) ?? [],
      totalUnpaidCzk: r.totalUnpaidCzk,
      perClientTotals: parseJson(r.perClientTotalsJson) ?? [],
      createdAt: r.createdAt ?? undefined,
    });
  }

  const invoiceRows = db.select().from(invoicesTable).all();
  store.invoices.clear();
  for (const r of invoiceRows) {
    store.invoices.set(r.id, {
      id: r.id,
      clientId: r.clientId,
      number: r.number,
      dueDate: r.dueDate,
      issueDate: r.issueDate,
      amountCzk: r.amountCzk,
      status: r.status as Invoice["status"],
      appointmentIds: parseJson(r.appointmentIdsJson) ?? [],
      issuer: parseJson(r.issuerJson),
      recipient: parseJson(r.recipientJson) ?? { firstName: "", lastName: "", street: "", city: "", zip: "", country: "CZ" },
      createdAt: r.createdAt ?? undefined,
      sentAt: r.sentAt ?? undefined,
      paidAt: r.paidAt ?? undefined,
    });
  }

  const notifRows = db.select().from(notificationsTable).all();
  store.notifications.clear();
  for (const r of notifRows) {
    store.notifications.set(r.id, {
      id: r.id,
      userId: r.userId ?? undefined,
      channel: r.channel as Notification["channel"],
      title: r.title ?? undefined,
      message: r.message,
      read: r.read ?? false,
      createdAt: r.createdAt,
      appointmentId: r.appointmentId ?? undefined,
      blockId: r.blockId ?? undefined,
    });
  }

  const reportRows = db.select().from(therapyReportsTable).all();
  store.therapyReports.clear();
  for (const r of reportRows) {
    store.therapyReports.set(r.id, {
      id: r.id,
      clientId: r.clientId,
      uploadedBy: r.uploadedBy,
      fileName: r.fileName,
      mimeType: r.mimeType ?? undefined,
      visibleToClient: r.visibleToClient ?? false,
      createdAt: r.createdAt,
    });
  }

  const blobRows = db.select().from(therapyReportBlobsTable).all();
  store.therapyReportBlobs.clear();
  for (const r of blobRows) {
    if (r.blob) {
      const buf = Buffer.from(r.blob, "base64");
      store.therapyReportBlobs.set(r.id, buf);
    }
  }

  const waitlistRows = db.select().from(waitlistTable).all();
  store.waitlist.clear();
  for (const r of waitlistRows) {
    store.waitlist.set(r.id, {
      id: r.id,
      clientId: r.clientId,
      serviceId: r.serviceId,
      preferredDays: parseJson(r.preferredDaysJson),
      preferredTimeStart: r.preferredTimeStart ?? undefined,
      preferredTimeEnd: r.preferredTimeEnd ?? undefined,
      priority: r.priority ?? undefined,
      notes: r.notes ?? undefined,
      createdAt: r.createdAt,
    });
  }

  const settingsRows = db.select().from(settingsTable).all();
  const firstSettings = settingsRows[0];
  if (firstSettings) {
    Object.assign(store.settings, {
      freeCancelHours: firstSettings.freeCancelHours,
      businessHoursStart: firstSettings.businessHoursStart ?? undefined,
      businessHoursEnd: firstSettings.businessHoursEnd ?? undefined,
      invoiceNumberPrefix: firstSettings.invoiceNumberPrefix ?? undefined,
      invoiceNumberNext: firstSettings.invoiceNumberNext,
      invoiceDueDays: firstSettings.invoiceDueDays ?? undefined,
      invoiceIssuer: parseJson(firstSettings.invoiceIssuerJson),
      notificationEmailSender: parseJson(firstSettings.notificationEmailSenderJson),
      smsFaynConfig: parseJson(firstSettings.smsFaynConfigJson),
      reservationNotificationTiming: parseJson(firstSettings.reservationNotificationTimingJson),
      pushNotificationConfig: (() => {
        const raw = parseJson(firstSettings.pushNotificationConfigJson);
        if (!raw || typeof raw !== "object") return undefined;
        return { ...raw, enabled: raw.enabled === true };
      })(),
    } as Settings);
  }

  const actRows = db.select().from(bookingActivationsTable).all();
  store.bookingActivations.clear();
  for (const r of actRows) {
    store.bookingActivations.set(`${r.employeeId}:${r.monthKey}`, r.active);
  }

  const pushRows = db.select().from(pushSubscriptionsTable).all();
  store.pushSubscriptions.clear();
  for (const r of pushRows) {
    const sub: PushSubscription = {
      id: r.id ?? undefined,
      userId: r.userId,
      endpoint: r.endpoint,
      p256dh: r.p256dh,
      auth: r.auth,
      userAgent: r.userAgent ?? undefined,
      createdAt: r.createdAt ?? undefined,
    };
    store.pushSubscriptions.set(r.endpoint, sub);
  }
}
