/**
 * Data gateway: single abstraction for all data access.
 * Switch implementation via NEXT_PUBLIC_API_MODE=mock|http (default: mock).
 * Backend: replace MockApiClient with HttpApiClient when backend is ready.
 */
import type {
  LoginCredentials,
  Session,
  RegisterBody,
  RequestSmsCodeBody,
  VerifySmsCodeBody,
  ResetPasswordByAdminBody,
} from "@/lib/contracts/auth";
import type { ClientProfileLogEntry, ClientProfileLogListParams } from "@/lib/contracts";
import type { User, UserListParams, UserUpdate } from "@/lib/contracts/users";
import type { Service, ServiceCreate, ServiceUpdate } from "@/lib/contracts/services";
import type { Room, RoomCreate, RoomUpdate } from "@/lib/contracts/rooms";
import type {
  Appointment,
  AppointmentCreate,
  AppointmentUpdate,
  AppointmentCancelBody,
  TherapyBlockCreate,
} from "@/lib/contracts/appointments";
import type { AvailabilitySlot, BookableDay } from "@/lib/contracts/availability";
import type { BookingActivation, BookingActivationListParams, BookingActivationSet } from "@/lib/contracts/booking-activation";
import type { CreditAccount, CreditTransaction, CreditAdjustBody } from "@/lib/contracts/credits";
import type { BillingReport, BillingPeriod } from "@/lib/contracts/billing";
import type {
  Notification,
  NotificationSendBody,
  NotificationListParams,
  NotificationBulkSendBody,
  PushSubscription,
  PushSubscribeBody,
} from "@/lib/contracts/notifications";
import type {
  TherapyReportFile,
  ReportUploadResult,
  ReportVisibilityUpdate,
} from "@/lib/contracts/reports";
import type {
  WaitingListEntry,
  WaitlistSuggestion,
} from "@/lib/contracts/waitlist";
import type { Settings, SettingsUpdate } from "@/lib/contracts/settings";
import type { Invoice, InvoiceCreate, InvoiceUpdate, InvoiceListParams } from "@/lib/contracts/invoices";
import type { BankTransaction, BankTransactionListParams } from "@/lib/contracts/bank-transactions";
import type {
  OccupancyStat,
  CancellationStat,
  ClientTagStat,
} from "@/lib/contracts/stats";
import type {
  BehaviorEvaluationRecord,
  SentCommunication,
  SentCommunicationListParams,
  ClientRecommendation,
} from "@/lib/contracts/admin-background";
import type { MedicalReport, MedicalReportCreate } from "@/lib/contracts";
import { MockApiClient } from "./mock/mockClient";
import { HttpApiClient } from "./http/httpClient";

/** Per-client behavior score summary (reliability 0–100, etc.). */
export type ClientBehaviorScore = {
  clientId: string;
  reliabilityScore: number;
  cancellationRiskScore: number;
  reactivityScore: number;
  fillHelperScore: number;
};

export type ApiClient = {
  auth: {
    login: (credentials: LoginCredentials) => Promise<{ user: User; session: Session }>;
    me: () => Promise<{ user: User; session: Session } | null>;
    logout: () => Promise<void>;
    /** Client self-registration (optionally with SMS code). */
    register: (body: RegisterBody) => Promise<{ user: User; session: Session }>;
    /** Request SMS verification code (registration or login). */
    requestSmsCode: (body: RequestSmsCodeBody) => Promise<{ expiresInSeconds: number }>;
    /** Verify SMS code. */
    verifySmsCode: (body: VerifySmsCodeBody) => Promise<{ verified: boolean }>;
  };
  clientProfileLog: {
    list: (params: ClientProfileLogListParams) => Promise<ClientProfileLogEntry[]>;
  };
  users: {
    list: (params?: UserListParams) => Promise<{ users: User[]; total: number }>;
    get: (id: string) => Promise<User | null>;
    update: (id: string, data: UserUpdate) => Promise<User>;
  };
  services: {
    list: () => Promise<Service[]>;
    get: (id: string) => Promise<Service | null>;
    create: (data: ServiceCreate) => Promise<Service>;
    update: (id: string, data: ServiceUpdate) => Promise<Service>;
  };
  rooms: {
    list: () => Promise<Room[]>;
    get: (id: string) => Promise<Room | null>;
    create: (data: RoomCreate) => Promise<Room>;
    update: (id: string, data: RoomUpdate) => Promise<Room>;
  };
  availability: {
    list: (params: { employeeId: string; from: string; to: string }) => Promise<AvailabilitySlot[]>;
    bookableDays: (params: { from: string; to: string }) => Promise<BookableDay[]>;
  };
  bookingActivations: {
    list: (params: BookingActivationListParams) => Promise<{ activations: BookingActivation[] }>;
    set: (data: BookingActivationSet) => Promise<void>;
  };
  appointments: {
    list: (params: {
      clientId?: string;
      employeeId?: string;
      from?: string;
      to?: string;
      status?: string;
    }) => Promise<Appointment[]>;
    get: (id: string) => Promise<Appointment | null>;
    create: (data: AppointmentCreate) => Promise<Appointment>;
    createBlock: (data: TherapyBlockCreate) => Promise<{ blockId: string; appointments: Appointment[] }>;
    update: (id: string, data: AppointmentUpdate) => Promise<Appointment>;
    cancel: (id: string, body?: AppointmentCancelBody) => Promise<{ appointment: Appointment; creditTransaction?: CreditTransaction }>;
    complete: (id: string) => Promise<Appointment>;
  };
  credits: {
    get: (clientId: string) => Promise<CreditAccount>;
    getTransactions: (clientId: string) => Promise<CreditTransaction[]>;
    adjust: (clientId: string, body: CreditAdjustBody) => Promise<CreditTransaction>;
  };
  billing: {
    generateMonthly: (period: BillingPeriod) => Promise<BillingReport>;
    getReport: (id: string) => Promise<BillingReport | null>;
    exportCsv: (reportId: string) => Promise<string>;
    markInvoiced: (appointmentIds: string[]) => Promise<void>;
  };
  invoices: {
    list: (params?: InvoiceListParams) => Promise<Invoice[]>;
    get: (id: string) => Promise<Invoice | null>;
    create: (data: InvoiceCreate) => Promise<Invoice>;
    update: (id: string, data: InvoiceUpdate) => Promise<Invoice>;
    send: (id: string) => Promise<void>;
    sendBulk: (invoiceIds: string[]) => Promise<void>;
    /** Send reminder emails for overdue (SENT, dueDate &lt; today) invoices. Returns count sent. */
    sendOverdueReminders: () => Promise<{ sent: number }>;
  };
  bankTransactions: {
    /** List bank transactions in date range (after optional sync from FIO Bank API). */
    list: (params: BankTransactionListParams) => Promise<BankTransaction[]>;
    /** Fetch latest from FIO Bank API and merge into local list (placeholder: no-op in mock). */
    sync: (params: BankTransactionListParams) => Promise<{ imported: number }>;
    /** Match a transaction to an invoice; marks invoice as PAID and stores reference. */
    match: (invoiceId: string, transactionId: string) => Promise<void>;
  };
  waitlist: {
    list: () => Promise<WaitingListEntry[]>;
    create: (data: Omit<WaitingListEntry, "id" | "createdAt">) => Promise<WaitingListEntry>;
    update: (id: string, data: Partial<WaitingListEntry>) => Promise<WaitingListEntry>;
    suggestions: (params: { slotStart: string; slotEnd: string; serviceId?: string }) => Promise<WaitlistSuggestion[]>;
    notify: (entryId: string) => Promise<void>;
  };
  reports: {
    upload: (clientId: string, file: File) => Promise<ReportUploadResult>;
    list: (clientId: string) => Promise<TherapyReportFile[]>;
    download: (id: string) => Promise<Blob>;
    updateVisibility: (id: string, data: ReportVisibilityUpdate) => Promise<TherapyReportFile>;
  };
  /** Medical reports (therapist-written): list by client, create, get, export PDF/DOCX. */
  medicalReports: {
    list: (clientId: string) => Promise<MedicalReport[]>;
    create: (data: MedicalReportCreate) => Promise<MedicalReport>;
    get: (id: string) => Promise<MedicalReport | null>;
    exportPdf: (id: string) => Promise<Blob>;
    exportDocx: (id: string) => Promise<Blob>;
  };
  /** Behavior scores per client (for list display). Optional clientIds to limit. */
  behavior: {
    getClientScores: (clientIds?: string[]) => Promise<ClientBehaviorScore[]>;
  };
  notifications: {
    list: (params?: NotificationListParams) => Promise<Notification[]>;
    send: (body: NotificationSendBody) => Promise<void>;
    /** Send email or SMS to selected client IDs (bulk). */
    sendBulk: (body: NotificationBulkSendBody) => Promise<{ sent: number }>;
    read: (id: string) => Promise<void>;
  };
  pushSubscriptions: {
    subscribe: (body: PushSubscribeBody) => Promise<PushSubscription>;
    unsubscribe: (endpoint: string) => Promise<void>;
    list: () => Promise<PushSubscription[]>;
  };
  /** Public push config (VAPID public key) for client subscription. */
  push: {
    getConfig: () => Promise<{ vapidPublicKey: string | null }>;
  };
  settings: {
    get: () => Promise<Settings>;
    update: (data: SettingsUpdate) => Promise<Settings>;
  };
  stats: {
    occupancy: (params: { from: string; to: string }) => Promise<OccupancyStat[]>;
    cancellations: (params: { from: string; to: string }) => Promise<CancellationStat[]>;
    clientTags: () => Promise<ClientTagStat[]>;
  };
  admin: {
    getBehaviorEvaluations: () => Promise<BehaviorEvaluationRecord[]>;
    getSentCommunications: (params?: SentCommunicationListParams) => Promise<SentCommunication[]>;
    getRecommendations: () => Promise<ClientRecommendation[]>;
    /** Reset client password and send email to set new one. Admin only. */
    resetClientPassword: (body: ResetPasswordByAdminBody) => Promise<void>;
  };
};

const apiMode = process.env.NEXT_PUBLIC_API_MODE ?? "mock";
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const apiInstance =
  apiMode === "http" ? new HttpApiClient(baseUrl) : new MockApiClient();

// Ensure availability.bookableDays exists (avoids undefined after stale build)
if (!apiInstance.availability.bookableDays) {
  (apiInstance.availability as Record<string, unknown>).bookableDays =
    async (_params: { from: string; to: string }): Promise<BookableDay[]> => [];
}

export const api: ApiClient = apiInstance;
