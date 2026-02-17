/**
 * HTTP API client: real REST calls. Aplikace běží pouze s backendem (NEXT_PUBLIC_API_MODE=http).
 * Backend: implement endpoints per BACKEND CONTRACT comments below and in contracts.
 */

import type { ApiClient } from "../index";
import type { User } from "@/lib/contracts/users";
import type {
  Session,
  LoginCredentials,
  RegisterBody,
  RequestSmsCodeBody,
  VerifySmsCodeBody,
  ResetPasswordByAdminBody,
  ChangePasswordBody,
  InviteUserBody,
} from "@/lib/contracts/auth";
import type { ClientProfileLogEntry, ClientProfileLogListParams } from "@/lib/contracts";
import type { UserListParams, UserUpdate } from "@/lib/contracts/users";
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
import type { Invoice, InvoiceCreate, InvoiceUpdate, InvoiceListParams } from "@/lib/contracts/invoices";
import type { BankTransaction, BankTransactionListParams } from "@/lib/contracts/bank-transactions";
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
import type { WaitingListEntry, WaitlistSuggestion } from "@/lib/contracts/waitlist";
import type { Settings, SettingsUpdate, TestEmailBody } from "@/lib/contracts/settings";
import type { OccupancyStat, CancellationStat, ClientTagStat } from "@/lib/contracts/stats";
import type {
  BehaviorEvaluationRecord,
  SentCommunication,
  SentCommunicationListParams,
  ClientRecommendation,
} from "@/lib/contracts/admin-background";
import type { SlotOfferApproval, SlotOfferApprovalCreate } from "@/lib/contracts/slot-offer-approval";
import type { MedicalReport, MedicalReportCreate } from "@/lib/contracts";
import type { ClientBehaviorScore } from "../index";
import { computeRecommendations } from "@/lib/behavior/recommendations";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("pristav_session");
    if (!s) return null;
    const session = JSON.parse(s) as Session;
    return session.accessToken ?? null;
  } catch {
    return null;
  }
}

const RETRY_DELAYS_502 = [5000, 10000, 15000]; // ms, for Railway sleep wake-up

async function fetchApi<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    if (retryCount < RETRY_DELAYS_502.length) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_502[retryCount]));
      return fetchApi<T>(baseUrl, path, options, retryCount + 1);
    }
    throw err;
  }
  if (res.status === 502 && retryCount < RETRY_DELAYS_502.length) {
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_502[retryCount]));
    return fetchApi<T>(baseUrl, path, options, retryCount + 1);
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = text || `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text) as { detail?: string; message?: string };
      if (json.message) msg = json.detail ? `${json.message}: ${json.detail}` : json.message;
    } catch {
      // use text as-is
    }
    throw new Error(res.status === 401 ? "Unauthorized" : msg);
  }
  if (res.status === 204) return undefined as T;
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as T;
}

export class HttpApiClient implements ApiClient {
  constructor(private baseUrl: string) {}

  auth = {
    /**
     * BACKEND CONTRACT (to implement later):
     * POST /auth/login
     * Body: { email?, password?, role? }
     * Returns: { user: User, accessToken, refreshToken?, expiresIn }
     * Errors: 401 invalid credentials
     */
    login: async (credentials: LoginCredentials): Promise<{ user: User; session: Session }> => {
      const res = await fetchApi<{ user: User; accessToken: string; refreshToken?: string; expiresIn?: number }>(
        this.baseUrl,
        "/auth/login",
        { method: "POST", body: JSON.stringify(credentials) }
      );
      const session: Session = {
        userId: res.user.id,
        role: res.user.role,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        expiresAt: res.expiresIn ? Date.now() + res.expiresIn * 1000 : undefined,
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pristav_session", JSON.stringify(session));
          localStorage.setItem("pristav_user", JSON.stringify(res.user));
        } catch {}
      }
      return { user: res.user, session };
    },

    /**
     * BACKEND CONTRACT (to implement later):
     * GET /auth/me
     * Headers: Authorization: Bearer <accessToken>
     * Returns: { user: User } or 401
     * On 401: frontend should attempt refresh token then redirect to login.
     */
    me: async (): Promise<{ user: User; session: Session } | null> => {
      const token = getToken();
      if (!token) return null;
      try {
        const res = await fetchApi<{ user: User }>(this.baseUrl, "/auth/me");
        const session = JSON.parse(localStorage.getItem("pristav_session") ?? "{}") as Session;
        return { user: res.user, session };
      } catch {
        return null;
      }
    },

    logout: async (): Promise<void> => {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("pristav_session");
          localStorage.removeItem("pristav_user");
        } catch {}
      }
    },
    register: async (body: RegisterBody): Promise<{ user: User; session: Session }> => {
      const res = await fetchApi<{ user: User; accessToken: string; expiresIn?: number }>(
        this.baseUrl,
        "/auth/register",
        { method: "POST", body: JSON.stringify(body) }
      );
      const session: Session = {
        userId: res.user.id,
        role: res.user.role,
        accessToken: res.accessToken,
        expiresAt: res.expiresIn ? Date.now() + res.expiresIn * 1000 : undefined,
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pristav_session", JSON.stringify(session));
          localStorage.setItem("pristav_user", JSON.stringify(res.user));
        } catch {}
      }
      return { user: res.user, session };
    },
    requestSmsCode: async (body: RequestSmsCodeBody) =>
      fetchApi<{ expiresInSeconds: number }>(this.baseUrl, "/auth/sms/request", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    verifySmsCode: async (body: VerifySmsCodeBody) =>
      fetchApi<{ verified: boolean }>(this.baseUrl, "/auth/sms/verify", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    changePassword: async (body: ChangePasswordBody): Promise<void> => {
      await fetchApi<{ ok: boolean }>(this.baseUrl, "/auth/change-password", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
  };

  clientProfileLog = {
    list: async (params: ClientProfileLogListParams) => {
      const q = new URLSearchParams({ clientId: params.clientId });
      if (params.limit) q.set("limit", String(params.limit));
      return fetchApi<ClientProfileLogEntry[]>(this.baseUrl, `/client-profile-log?${q}`);
    },
  };

  users = {
    /**
     * BACKEND CONTRACT (to implement later):
     * GET /users?role=&search=&page=&limit=
     * Returns: { users: User[], total: number }
     */
    list: async (params?: UserListParams): Promise<{ users: User[]; total: number }> => {
      const q = new URLSearchParams();
      if (params?.role) q.set("role", params.role);
      if (params?.search) q.set("search", params.search);
      if (params?.page) q.set("page", String(params.page));
      if (params?.limit) q.set("limit", String(params.limit));
      return fetchApi(this.baseUrl, `/users?${q}`);
    },
    /**
     * GET /users/:id
     */
    get: async (id: string): Promise<User | null> => {
      try {
        return await fetchApi(this.baseUrl, `/users/${id}`);
      } catch {
        return null;
      }
    },
    /**
     * BACKEND CONTRACT (to implement later):
     * PUT /users/:id
     * Body: UserUpdate
     */
    update: async (id: string, data: UserUpdate): Promise<User> => {
      return fetchApi(this.baseUrl, `/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
    },
    invite: async (body: InviteUserBody): Promise<{ user: Pick<User, "id" | "email" | "name" | "role">; message: string }> => {
      return fetchApi(this.baseUrl, "/users/invite", { method: "POST", body: JSON.stringify(body) });
    },
  };

  services = {
    list: async () => fetchApi<Service[]>(this.baseUrl, "/services"),
    get: async (id: string) => {
      try {
        return await fetchApi<Service>(this.baseUrl, `/services/${id}`);
      } catch {
        return null;
      }
    },
    create: async (data: ServiceCreate) =>
      fetchApi<Service>(this.baseUrl, "/services", { method: "POST", body: JSON.stringify(data) }),
    update: async (id: string, data: ServiceUpdate) =>
      fetchApi<Service>(this.baseUrl, `/services/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  };

  rooms = {
    list: async () => fetchApi<Room[]>(this.baseUrl, "/rooms"),
    get: async (id: string) => {
      try {
        return await fetchApi<Room>(this.baseUrl, `/rooms/${id}`);
      } catch {
        return null;
      }
    },
    create: async (data: RoomCreate) =>
      fetchApi<Room>(this.baseUrl, "/rooms", { method: "POST", body: JSON.stringify(data) }),
    update: async (id: string, data: RoomUpdate) =>
      fetchApi<Room>(this.baseUrl, `/rooms/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  };

  availability = {
    /**
     * BACKEND CONTRACT (to implement later):
     * GET /availability?employeeId=&from=&to=
     * Returns: AvailabilitySlot[] (open hourly slots; only in activated months)
     */
    list: async (params: { employeeId: string; from: string; to: string }) => {
      const q = new URLSearchParams(params);
      return fetchApi<AvailabilitySlot[]>(this.baseUrl, `/availability?${q}`);
    },
    /**
     * GET /availability/bookable-days?from=&to=
     * Returns: BookableDay[] (date + availableCount for client calendar)
     */
    bookableDays: async (params: { from: string; to: string }) => {
      const q = new URLSearchParams(params);
      return fetchApi<BookableDay[]>(this.baseUrl, `/availability/bookable-days?${q}`);
    },
  };

  bookingActivations = {
    /**
     * GET /booking-activations?fromMonth=&toMonth=
     * Returns: { activations: BookingActivation[] }
     */
    list: async (params: BookingActivationListParams) =>
      fetchApi<{ activations: BookingActivation[] }>(
        this.baseUrl,
        `/booking-activations?fromMonth=${params.fromMonth}&toMonth=${params.toMonth}`
      ),
    /**
     * PUT /booking-activations
     * Body: { employeeId, monthKey, active }
     */
    set: async (data: BookingActivationSet) =>
      fetchApi<void>(this.baseUrl, "/booking-activations", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  };

  appointments = {
    /**
     * BACKEND CONTRACT (to implement later):
     * GET /appointments?clientId=&employeeId=&from=&to=&status=
     * Returns: Appointment[]
     */
    list: async (params: {
      clientId?: string;
      employeeId?: string;
      from?: string;
      to?: string;
      status?: string;
    }) => {
      const q = new URLSearchParams(params as Record<string, string>);
      return fetchApi<Appointment[]>(this.baseUrl, `/appointments?${q}`);
    },
    get: async (id: string) => {
      try {
        return await fetchApi<Appointment>(this.baseUrl, `/appointments/${id}`);
      } catch {
        return null;
      }
    },
    /**
     * POST /appointments
     * Body: AppointmentCreate
     * Returns: Appointment (backend may deduct credits and set PAID/UNPAID)
     */
    create: async (data: AppointmentCreate) =>
      fetchApi<Appointment>(this.baseUrl, "/appointments", { method: "POST", body: JSON.stringify(data) }),
    /**
     * POST /appointments/blocks
     * Body: TherapyBlockCreate
     * Returns: { blockId: string, appointments: Appointment[] }
     * Admin/Reception only; notification system treats block as single appointment.
     */
    createBlock: async (data: TherapyBlockCreate) =>
      fetchApi<{ blockId: string; appointments: Appointment[] }>(this.baseUrl, "/appointments/blocks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    /**
     * PUT /appointments/:id
     * Body: AppointmentUpdate
     */
    update: async (id: string, data: AppointmentUpdate) =>
      fetchApi<Appointment>(this.baseUrl, `/appointments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    /**
     * BACKEND CONTRACT (to implement later):
     * POST /appointments/:id/cancel
     * Body: { refund?: boolean, reason?: string }
     * Returns: { appointment: Appointment, creditTransaction?: CreditTransaction }
     * Errors: 403 RBAC, 409 already cancelled
     */
    cancel: async (id: string, body?: AppointmentCancelBody) =>
      fetchApi<{ appointment: Appointment; creditTransaction?: CreditTransaction }>(
        this.baseUrl,
        `/appointments/${id}/cancel`,
        { method: "POST", body: JSON.stringify(body ?? {}) }
      ),
    /**
     * POST /appointments/:id/complete
     * Returns: Appointment
     */
    complete: async (id: string) =>
      fetchApi<Appointment>(this.baseUrl, `/appointments/${id}/complete`, { method: "POST" }),
  };

  credits = {
    /**
     * GET /credits/:clientId
     * Returns: CreditAccount
     */
    get: async (clientId: string) => fetchApi<CreditAccount>(this.baseUrl, `/credits/${clientId}`),
    getTransactions: async (clientId: string) =>
      fetchApi<CreditTransaction[]>(this.baseUrl, `/credits/${clientId}/transactions`),
    /**
     * POST /credits/:clientId/adjust
     * Body: { amountCzk, reason }
     * Returns: CreditTransaction
     */
    adjust: async (clientId: string, body: CreditAdjustBody) =>
      fetchApi<CreditTransaction>(this.baseUrl, `/credits/${clientId}/adjust`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  };

  billing = {
    /**
     * POST /billing/reports
     * Body: { period: { year, month } }
     * Returns: BillingReport
     */
    generateMonthly: async (period: BillingPeriod) =>
      fetchApi<BillingReport>(this.baseUrl, "/billing/reports", {
        method: "POST",
        body: JSON.stringify({ period }),
      }),
    getReport: async (id: string) => {
      try {
        return await fetchApi<BillingReport>(this.baseUrl, `/billing/reports/${id}`);
      } catch {
        return null;
      }
    },
    /**
     * GET /billing/reports/:id/export
     * Returns: CSV string or blob URL
     */
    exportCsv: async (reportId: string) =>
      fetchApi<string>(this.baseUrl, `/billing/reports/${reportId}/export`),
    /**
     * POST /billing/reports/mark-invoiced
     * Body: { appointmentIds: string[] }
     */
    markInvoiced: async (appointmentIds: string[]) =>
      fetchApi<void>(this.baseUrl, "/billing/reports/mark-invoiced", {
        method: "POST",
        body: JSON.stringify({ appointmentIds }),
      }),
  };

  invoices = {
    list: async (params?: InvoiceListParams) => {
      const q = new URLSearchParams((params ?? {}) as Record<string, string>);
      return fetchApi<Invoice[]>(this.baseUrl, `/invoices?${q}`);
    },
    get: async (id: string) => {
      try {
        return await fetchApi<Invoice>(this.baseUrl, `/invoices/${id}`);
      } catch {
        return null;
      }
    },
    create: async (data: InvoiceCreate) =>
      fetchApi<Invoice>(this.baseUrl, "/invoices", { method: "POST", body: JSON.stringify(data) }),
    update: async (id: string, data: InvoiceUpdate) =>
      fetchApi<Invoice>(this.baseUrl, `/invoices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    send: async (id: string) =>
      fetchApi<void>(this.baseUrl, `/invoices/${id}/send`, { method: "POST" }),
    sendBulk: async (invoiceIds: string[]) =>
      fetchApi<void>(this.baseUrl, "/invoices/send-bulk", { method: "POST", body: JSON.stringify({ invoiceIds }) }),
    sendOverdueReminders: async () =>
      fetchApi<{ sent: number }>(this.baseUrl, "/invoices/send-overdue-reminders", { method: "POST" }),
  };

  bankTransactions = {
    list: async (params: BankTransactionListParams) => {
      const q = new URLSearchParams(params as Record<string, string>);
      return fetchApi<BankTransaction[]>(this.baseUrl, `/bank-transactions?${q}`);
    },
    sync: async (params: BankTransactionListParams) =>
      fetchApi<{ imported: number }>(this.baseUrl, "/bank-transactions/sync", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    match: async (invoiceId: string, transactionId: string) =>
      fetchApi<void>(this.baseUrl, "/bank-transactions/match", {
        method: "POST",
        body: JSON.stringify({ invoiceId, transactionId }),
      }),
  };

  waitlist = {
    list: async () => fetchApi<WaitingListEntry[]>(this.baseUrl, "/waitlist"),
    create: async (data: Omit<WaitingListEntry, "id" | "createdAt">) =>
      fetchApi<WaitingListEntry>(this.baseUrl, "/waitlist", { method: "POST", body: JSON.stringify(data) }),
    update: async (id: string, data: Partial<WaitingListEntry>) =>
      fetchApi<WaitingListEntry>(this.baseUrl, `/waitlist/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: async (id: string) =>
      fetchApi<void>(this.baseUrl, `/waitlist/${id}`, { method: "DELETE" }),
    /**
     * GET /waitlist/suggestions?slotStart=&slotEnd=&serviceId=
     * Returns: WaitlistSuggestion[]
     */
    suggestions: async (params: { slotStart: string; slotEnd: string; serviceId?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>);
      return fetchApi<WaitlistSuggestion[]>(this.baseUrl, `/waitlist/suggestions?${q}`);
    },
    /**
     * POST /waitlist/:id/notify
     * Sends offer notification to client
     */
    notify: async (entryId: string) =>
      fetchApi<void>(this.baseUrl, `/waitlist/${entryId}/notify`, { method: "POST" }),
  };

  reports = {
    /**
     * BACKEND CONTRACT (to implement later):
     * POST /reports/upload (multipart) or GET /reports/upload-url (presigned S3 URL)
     * Returns: ReportUploadResult
     */
    upload: async (clientId: string, file: File) => {
      const form = new FormData();
      form.append("clientId", clientId);
      form.append("file", file);
      const token = getToken();
      const res = await fetch(`${this.baseUrl}/reports/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<ReportUploadResult>;
    },
    list: async (clientId: string) =>
      fetchApi<TherapyReportFile[]>(this.baseUrl, `/reports?clientId=${clientId}`),
    /**
     * GET /reports/:id/download
     * Returns: blob
     */
    download: async (id: string) => {
      const token = getToken();
      const res = await fetch(`${this.baseUrl}/reports/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      return res.blob();
    },
    updateVisibility: async (id: string, data: ReportVisibilityUpdate) =>
      fetchApi<TherapyReportFile>(this.baseUrl, `/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  };

  medicalReports = {
    list: async (clientId: string) =>
      fetchApi<MedicalReport[]>(this.baseUrl, `/medical-reports?clientId=${clientId}`),
    create: async (data: MedicalReportCreate) =>
      fetchApi<MedicalReport>(this.baseUrl, "/medical-reports", { method: "POST", body: JSON.stringify(data) }),
    get: async (id: string) => fetchApi<MedicalReport | null>(this.baseUrl, `/medical-reports/${id}`),
    exportPdf: async (id: string) => {
      const token = getToken();
      const res = await fetch(`${this.baseUrl}/medical-reports/${id}/export/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      return res.blob();
    },
    exportDocx: async (id: string) => {
      const token = getToken();
      const res = await fetch(`${this.baseUrl}/medical-reports/${id}/export/docx`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      return res.blob();
    },
  };

  behavior = {
    getClientScores: async (clientIds?: string[]) => {
      const q = clientIds?.length ? `?clientIds=${clientIds.join(",")}` : "";
      return fetchApi<ClientBehaviorScore[]>(this.baseUrl, `/behavior/scores${q}`);
    },
  };

  notifications = {
    /**
     * GET /notifications?read=&limit=&appointmentId=&blockId=
     * Returns: Notification[]
     */
    list: async (params?: NotificationListParams) => {
      const q = new URLSearchParams();
      if (params?.read !== undefined) q.set("read", String(params.read));
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.appointmentId) q.set("appointmentId", params.appointmentId);
      if (params?.blockId) q.set("blockId", params.blockId);
      return fetchApi<Notification[]>(this.baseUrl, `/notifications?${q}`);
    },
    /**
     * POST /notifications/send
     * Body: NotificationSendBody
     */
    send: async (body: NotificationSendBody) =>
      fetchApi<void>(this.baseUrl, "/notifications/send", { method: "POST", body: JSON.stringify(body) }),
    /**
     * PATCH /notifications/:id/read
     */
    read: async (id: string) =>
      fetchApi<void>(this.baseUrl, `/notifications/${id}/read`, { method: "PATCH" }),
    sendBulk: async (body: NotificationBulkSendBody) =>
      fetchApi<{ sent: number; skippedNoPhone?: number; errors?: string[] }>(this.baseUrl, "/notifications/send-bulk", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  };

  pushSubscriptions = {
    subscribe: async (body: PushSubscribeBody) =>
      fetchApi<PushSubscription>(this.baseUrl, "/push-subscriptions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    unsubscribe: async (endpoint: string) =>
      fetchApi<void>(this.baseUrl, "/push-subscriptions", {
        method: "DELETE",
        body: JSON.stringify({ endpoint }),
      }),
    list: async () => fetchApi<PushSubscription[]>(this.baseUrl, "/push-subscriptions"),
  };

  push = {
    getConfig: async () =>
      fetchApi<{ vapidPublicKey: string | null }>(this.baseUrl, "/push-config"),
    sendTestPush: async (body?: { userId?: string; title?: string; body?: string }) =>
      fetchApi<{ sent: number; total: number; errors?: string[] }>(this.baseUrl, "/push-subscriptions/test", {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
  };

  settings = {
    get: async () => fetchApi<Settings>(this.baseUrl, "/settings"),
    /**
     * PUT /settings
     * Body: SettingsUpdate (admin only)
     */
    update: async (data: SettingsUpdate) =>
      fetchApi<Settings>(this.baseUrl, "/settings", { method: "PUT", body: JSON.stringify(data) }),
    getEmailStatus: async () =>
      fetchApi<{ ok: boolean; message: string; details?: string }>(this.baseUrl, "/settings/email-status"),
    /**
     * POST /settings/test-email
     * Body: TestEmailBody (admin only; requires SMTP env on server)
     */
    sendTestEmail: async (body: TestEmailBody) =>
      fetchApi<{ sent: true; to: string }>(this.baseUrl, "/settings/test-email", { method: "POST", body: JSON.stringify(body) }),
  };

  stats = {
    /**
     * GET /stats/occupancy?from=&to=
     * Returns: OccupancyStat[]
     */
    occupancy: async (params: { from: string; to: string }) =>
      fetchApi<OccupancyStat[]>(this.baseUrl, `/stats/occupancy?from=${params.from}&to=${params.to}`),
    /**
     * GET /stats/cancellations?from=&to=
     * Returns: CancellationStat[]
     */
    cancellations: async (params: { from: string; to: string }) =>
      fetchApi<CancellationStat[]>(this.baseUrl, `/stats/cancellations?from=${params.from}&to=${params.to}`),
    /**
     * GET /stats/client-tags
     * Returns: ClientTagStat[]
     */
    clientTags: async () => fetchApi<ClientTagStat[]>(this.baseUrl, "/stats/client-tags"),
  };

  admin = {
    getBehaviorEvaluations: async (): Promise<BehaviorEvaluationRecord[]> => {
      // Backend: GET /admin/behavior-evaluations when implemented
      return [];
    },
    getSentCommunications: async (_params?: SentCommunicationListParams): Promise<SentCommunication[]> => {
      // Backend: GET /admin/communications when implemented
      return [];
    },
    getRecommendations: async (): Promise<ClientRecommendation[]> => {
      const [usersRes, appointments, waitlist] = await Promise.all([
        fetchApi<{ users: User[]; total: number }>(this.baseUrl, "/users?role=CLIENT&limit=500"),
        fetchApi<Appointment[]>(this.baseUrl, "/appointments"),
        fetchApi<WaitingListEntry[]>(this.baseUrl, "/waitlist"),
      ]);
      return computeRecommendations({
        users: usersRes.users,
        appointments,
        waitlist,
      });
    },
    resetClientPassword: async (body: ResetPasswordByAdminBody) =>
      fetchApi<void>(this.baseUrl, "/admin/reset-client-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    /** Reset client behavior score (audit logged). Admin only. */
    behaviorReset: async (clientId: string, body?: { reason?: string }) =>
      fetchApi<{ ok: boolean; message: string }>(this.baseUrl, `/admin/clients/${encodeURIComponent(clientId)}/behavior-reset`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
    slotOfferApprovals: {
      list: async (params?: { status?: string; limit?: number; offset?: number }) => {
        const q = new URLSearchParams();
        if (params?.status) q.set("status", params.status);
        if (params?.limit != null) q.set("limit", String(params.limit));
        if (params?.offset != null) q.set("offset", String(params.offset));
        return fetchApi<{ approvals: SlotOfferApproval[]; total: number }>(
          this.baseUrl,
          `/admin/slot-offer-approvals?${q}`
        );
      },
      create: async (body: SlotOfferApprovalCreate) =>
        fetchApi<SlotOfferApproval>(this.baseUrl, "/admin/slot-offer-approvals", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      decide: async (id: string, body: { status: "APPROVED" | "REJECTED" }) =>
        fetchApi<SlotOfferApproval>(this.baseUrl, `/admin/slot-offer-approvals/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
    },
  };
}
