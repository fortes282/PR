/**
 * In-memory "DB" for mock API. All data is mutable; seed data is loaded once.
 * Backend: replace with real DB (Postgres, etc.); this file is for dev only.
 */
import type { User } from "@/lib/contracts/users";
import type { Service } from "@/lib/contracts/services";
import type { Room } from "@/lib/contracts/rooms";
import type { Appointment } from "@/lib/contracts/appointments";
import type { CreditAccount, CreditTransaction } from "@/lib/contracts/credits";
import type { BillingReport } from "@/lib/contracts/billing";
import type { Invoice } from "@/lib/contracts/invoices";
import type { Notification } from "@/lib/contracts/notifications";
import type { TherapyReportFile, ReportUploadResult } from "@/lib/contracts/reports";
import type { WaitingListEntry } from "@/lib/contracts/waitlist";
import type { Settings } from "@/lib/contracts/settings";
import type { BehaviorEvaluationRecord } from "@/lib/contracts/admin-background";

export const db = {
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
  therapyReportBlobs: new Map<string, Blob>(), // id -> blob (mock file store)
  waitlist: new Map<string, WaitingListEntry>(),
  settings: {
    freeCancelHours: 48,
    invoiceNumberPrefix: "F",
    invoiceNumberNext: 1,
    invoiceDueDays: 14,
  } as Settings,
  /** Key: `${employeeId}:${monthKey}` (YYYY-MM), value: active (client self-booking allowed). */
  bookingActivations: new Map<string, boolean>(),
  /** Algorithm evaluation history: what changed, when, why (admin background). */
  behaviorEvaluations: [] as BehaviorEvaluationRecord[],
};

export type MockDb = typeof db;
