/**
 * In-memory store mirroring frontend mockDb. Seed on startup.
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

export const store = {
  users: new Map<string, User>(),
  services: new Map<string, Service>(),
  rooms: new Map<string, Room>(),
  appointments: new Map<string, Appointment>(),
  creditAccounts: new Map<string, CreditAccount>(),
  creditTransactions: new Map<string, CreditTransaction>(),
  billingReports: new Map<string, BillingReport>(),
  invoices: new Map<string, Invoice>(),
  notifications: new Map<string, Notification>(),
  therapyReports: new Map<string, TherapyReportFile>(),
  therapyReportBlobs: new Map<string, Buffer>(),
  waitlist: new Map<string, WaitingListEntry>(),
  settings: {
    freeCancelHours: 48,
    invoiceNumberPrefix: "F",
    invoiceNumberNext: 1,
    invoiceDueDays: 14,
  } as Settings,
  bookingActivations: new Map<string, boolean>(),
  pushSubscriptions: new Map<string, PushSubscription>(), // key by endpoint
};

export type Store = typeof store;
