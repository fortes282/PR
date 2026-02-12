/**
 * Mock API client: in-memory, deterministic seed data.
 * All data access goes through this; swap to HttpApiClient when backend is ready.
 * Backend: see BACKEND CONTRACT comments in http/httpClient.ts for endpoint specs.
 */
import { db, type MockDb } from "./mockDb";
import { seed } from "./seed";
import type { ApiClient } from "../index";
import type { User } from "@/lib/contracts/users";
import type { Session, LoginCredentials, Role } from "@/lib/contracts/auth";
import type { UserListParams, UserUpdate } from "@/lib/contracts/users";
import type { Service, ServiceCreate, ServiceUpdate } from "@/lib/contracts/services";
import type { Room, RoomCreate, RoomUpdate } from "@/lib/contracts/rooms";
import type {
  Appointment,
  AppointmentCreate,
  AppointmentUpdate,
  AppointmentCancelBody,
  AppointmentStatus,
  PaymentStatus,
  TherapyBlockCreate,
} from "@/lib/contracts/appointments";
import type { AvailabilitySlot, BookableDay } from "@/lib/contracts/availability";
import type { BookingActivation, BookingActivationListParams, BookingActivationSet } from "@/lib/contracts/booking-activation";
import type { WorkingHoursSlot, LunchBreak } from "@/lib/contracts/users";
import type { CreditAccount, CreditTransaction, CreditAdjustBody } from "@/lib/contracts/credits";
import type { BillingReport, BillingPeriod } from "@/lib/contracts/billing";
import type {
  Invoice,
  InvoiceCreate,
  InvoiceUpdate,
  InvoiceListParams,
  InvoiceRecipient,
  InvoiceStatus,
} from "@/lib/contracts/invoices";
import type { BankTransaction, BankTransactionListParams } from "@/lib/contracts/bank-transactions";
import type {
  Notification,
  NotificationSendBody,
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
import type { BehaviorEvaluationRecord, SentCommunication, SentCommunicationListParams, ClientRecommendation } from "@/lib/contracts/admin-background";
import type { ClientProfileLogEntry, ClientProfileLogKind, ClientProfileLogListParams } from "@/lib/contracts";
import type { MedicalReport, MedicalReportCreate } from "@/lib/contracts";
import type { RegisterBody, RequestSmsCodeBody, VerifySmsCodeBody, ResetPasswordByAdminBody } from "@/lib/contracts/auth";
import type { ClientBehaviorScore } from "../index";
import { computeRecommendations } from "@/lib/behavior/recommendations";
import { deriveEventsFromAppointments } from "@/lib/behavior/derive-events";
import { computeBehaviorProfile } from "@/lib/behavior/profile";
import { canRefund } from "@/lib/cancellation";
import { addDays, subDays, startOfDay, addMonths, getDayOfWeek, parseTimeHHmm, setHours, setMinutes, monthKey } from "@/lib/utils/date";

const MOCK_SETTINGS_STORAGE_KEY = "pristav_mock_settings";

let seeded = false;
function ensureSeed(): void {
  if (!seeded) {
    seed();
    seeded = true;
  }
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function appendClientProfileLog(
  clientId: string,
  kind: ClientProfileLogKind,
  summary: string,
  detail?: string,
  actorId?: string
): void {
  const entry: ClientProfileLogEntry = {
    id: nextId("log"),
    clientId,
    kind,
    summary,
    detail,
    actorId: actorId ?? "system",
    createdAt: new Date().toISOString(),
  };
  db.clientProfileLog.push(entry);
}

export class MockApiClient implements ApiClient {
  private session: Session | null = null;

  auth = {
    /**
     * BACKEND CONTRACT (to implement later):
     * POST /auth/login
     * Body: { email?, password? } or { role: Role } for dev
     * Returns: { user, accessToken, refreshToken?, expiresIn }
     * Errors: 401 invalid credentials
     */
    login: async (credentials: LoginCredentials): Promise<{ user: User; session: Session }> => {
      ensureSeed();
      let user: User | undefined;
      if (credentials.role) {
        user = Array.from(db.users.values()).find((u) => u.role === credentials.role);
        if (!user) user = Array.from(db.users.values())[0];
      } else if (credentials.email) {
        user = Array.from(db.users.values()).find((u) => u.email === credentials.email);
      }
      if (!user) throw new Error("Invalid credentials");
      const session: Session = {
        userId: user.id,
        role: user.role,
        accessToken: `mock-token-${user.id}`,
        expiresAt: Date.now() + 3600_000,
      };
      this.session = session;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pristav_session", JSON.stringify(session));
          localStorage.setItem("pristav_user", JSON.stringify(user));
        } catch {}
      }
      return { user, session };
    },

    /**
     * BACKEND CONTRACT (to implement later):
     * GET /auth/me
     * Headers: Authorization: Bearer <accessToken>
     * Returns: { user } or 401
     */
    me: async (): Promise<{ user: User; session: Session } | null> => {
      ensureSeed();
      if (typeof window !== "undefined") {
        try {
          const s = localStorage.getItem("pristav_session");
          const u = localStorage.getItem("pristav_user");
          if (s && u) {
            this.session = JSON.parse(s) as Session;
            const user = JSON.parse(u) as User;
            return { user, session: this.session };
          }
        } catch {}
      }
      return this.session ? { user: db.users.get(this.session.userId)!, session: this.session } : null;
    },

    logout: async (): Promise<void> => {
      this.session = null;
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("pristav_session");
          localStorage.removeItem("pristav_user");
        } catch {}
      }
    },

    register: async (body: RegisterBody): Promise<{ user: User; session: Session }> => {
      ensureSeed();
      const existing = Array.from(db.users.values()).find((u) => u.email === body.email);
      if (existing) throw new Error("E-mail již je registrován.");
      if (body.smsCode) {
        const stored = db.smsVerificationCodes.get(body.phone ?? "");
        if (!stored || stored.code !== body.smsCode || Date.now() > stored.expiresAt) {
          throw new Error("Neplatný nebo vypršený SMS kód.");
        }
        db.smsVerificationCodes.delete(body.phone ?? "");
      } else if (body.phone) {
        throw new Error("Pro registraci s telefonem je vyžadováno ověření SMS. Zavolejte requestSmsCode a pak register s kódem.");
      }
      const id = nextId("u");
      const user: User = {
        id,
        email: body.email,
        name: body.name,
        role: "CLIENT",
        phone: body.phone,
        active: true,
        firstName: body.firstName,
        lastName: body.lastName,
      };
      db.users.set(id, user);
      const session: Session = {
        userId: id,
        role: "CLIENT",
        accessToken: `mock-token-${id}`,
        expiresAt: Date.now() + 3600_000,
      };
      this.session = session;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("pristav_session", JSON.stringify(session));
          localStorage.setItem("pristav_user", JSON.stringify(user));
        } catch {}
      }
      return { user, session };
    },

    requestSmsCode: async (body: RequestSmsCodeBody): Promise<{ expiresInSeconds: number }> => {
      ensureSeed();
      const code = String(Math.floor(1000 + Math.random() * 9000));
      db.smsVerificationCodes.set(body.phone, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      return { expiresInSeconds: 300 };
    },

    verifySmsCode: async (body: VerifySmsCodeBody): Promise<{ verified: boolean }> => {
      ensureSeed();
      const stored = db.smsVerificationCodes.get(body.phone);
      if (!stored || stored.code !== body.code || Date.now() > stored.expiresAt) {
        return { verified: false };
      }
      return { verified: true };
    },
  };

  clientProfileLog = {
    list: async (params: ClientProfileLogListParams): Promise<ClientProfileLogEntry[]> => {
      ensureSeed();
      const list = db.clientProfileLog
        .filter((e) => e.clientId === params.clientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const limit = params.limit ?? 50;
      return list.slice(0, limit);
    },
  };

  users = {
    /**
     * BACKEND CONTRACT (to implement later):
     * GET /users?role=&search=&page=&limit=
     * Returns: { users, total }
     */
    list: async (params?: UserListParams): Promise<{ users: User[]; total: number }> => {
      ensureSeed();
      let list = Array.from(db.users.values());
      if (params?.role) list = list.filter((u) => u.role === params.role);
      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      }
      const total = list.length;
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 50;
      list = list.slice((page - 1) * limit, page * limit);
      return { users: list, total };
    },

    get: async (id: string): Promise<User | null> => {
      ensureSeed();
      return db.users.get(id) ?? null;
    },

    /**
     * BACKEND CONTRACT (to implement later):
     * PUT /users/:id
     * Body: UserUpdate
     * Only ADMIN may update role.
     */
    update: async (id: string, data: UserUpdate): Promise<User> => {
      ensureSeed();
      if (data.role !== undefined && this.session?.role !== "ADMIN") {
        throw new Error("Pouze administrátor může měnit roli uživatele.");
      }
      const user = db.users.get(id);
      if (!user) throw new Error("User not found");
      const updated = { ...user, ...data };
      db.users.set(id, updated);
      if (user.role === "CLIENT") {
        if (data.role !== undefined || data.active !== undefined) {
          appendClientProfileLog(
            id,
            "ROLE_OR_ACTIVE_CHANGED",
            `Změna role nebo aktivity`,
            data.role !== undefined ? `Role: ${data.role}` : undefined,
            this.session?.userId
          );
        } else {
          appendClientProfileLog(id, "DATA_CHANGE", "Změna údajů klienta", undefined, this.session?.userId);
        }
      }
      return updated;
    },
  };

  services = {
    list: async () => {
      ensureSeed();
      return Array.from(db.services.values()).filter((s) => s.active);
    },
    get: async (id: string) => db.services.get(id) ?? null,
    create: async (data: ServiceCreate) => {
      ensureSeed();
      const id = nextId("s");
      const service = { ...data, id, active: true };
      db.services.set(id, service);
      return service;
    },
    update: async (id: string, data: ServiceUpdate) => {
      ensureSeed();
      const s = db.services.get(id);
      if (!s) throw new Error("Service not found");
      const updated = { ...s, ...data };
      db.services.set(id, updated);
      return updated;
    },
  };

  rooms = {
    list: async () => {
      ensureSeed();
      return Array.from(db.rooms.values()).filter((r) => r.active);
    },
    get: async (id: string) => db.rooms.get(id) ?? null,
    create: async (data: RoomCreate) => {
      ensureSeed();
      const id = nextId("r");
      const room = { ...data, id, active: true };
      db.rooms.set(id, room);
      return room;
    },
    update: async (id: string, data: RoomUpdate) => {
      ensureSeed();
      const r = db.rooms.get(id);
      if (!r) throw new Error("Room not found");
      const updated = { ...r, ...data };
      db.rooms.set(id, updated);
      return updated;
    },
  };

  availability = {
    /**
     * BACKEND CONTRACT (to implement later):
     * GET /availability?employeeId=&from=&to=
     * Returns open hourly slots (working hours minus existing appointments).
     */
    list: async (params: { employeeId: string; from: string; to: string }): Promise<AvailabilitySlot[]> => {
      ensureSeed();
      const user = db.users.get(params.employeeId);
      if (!user) return [];
      const fromDate = new Date(params.from);
      const toDate = new Date(params.to);
      const slots: AvailabilitySlot[] = [];
      const defaultHours: WorkingHoursSlot[] = [
        { dayOfWeek: 1, start: "08:00", end: "17:00" },
        { dayOfWeek: 2, start: "08:00", end: "17:00" },
        { dayOfWeek: 3, start: "08:00", end: "17:00" },
        { dayOfWeek: 4, start: "08:00", end: "17:00" },
        { dayOfWeek: 5, start: "08:00", end: "17:00" },
      ];
      const workingHours = user.workingHours?.length ? user.workingHours : defaultHours;
      const lunchBreaks = user.lunchBreaks ?? [];
      const existing = Array.from(db.appointments.values()).filter(
        (a) => a.employeeId === params.employeeId && a.status !== "CANCELLED"
      );
      let d = startOfDay(new Date(fromDate));
      while (d <= toDate) {
        const dayOfWeek = getDayOfWeek(d);
        const dayLunch = lunchBreaks.find((b: LunchBreak) => b.dayOfWeek === dayOfWeek);
        const daySlots = workingHours.filter((wh) => wh.dayOfWeek === dayOfWeek);
        for (const wh of daySlots) {
          const { h: startH, m: startM } = parseTimeHHmm(wh.start);
          const { h: endH, m: endM } = parseTimeHHmm(wh.end);
          for (let h = startH; h < endH || (h === endH && startM < endM); h++) {
            const slotStart = setMinutes(setHours(new Date(d), h), 0);
            const slotEnd = setMinutes(setHours(new Date(d), h + 1), 0);
            if (slotStart < fromDate || slotEnd > toDate) continue;
            const overlapsApp = existing.some(
              (a) => new Date(a.startAt) < slotEnd && new Date(a.endAt) > slotStart
            );
            if (overlapsApp) continue;
            if (dayLunch) {
              const { h: lStartH, m: lStartM } = parseTimeHHmm(dayLunch.start);
              const { h: lEndH, m: lEndM } = parseTimeHHmm(dayLunch.end);
              const lunchStart = setMinutes(setHours(new Date(d), lStartH), lStartM);
              const lunchEnd = setMinutes(setHours(new Date(d), lEndH), lEndM);
              const overlapsLunch = slotStart < lunchEnd && slotEnd > lunchStart;
              if (overlapsLunch) continue;
            }
            slots.push({ startAt: slotStart.toISOString(), endAt: slotEnd.toISOString() });
          }
        }
        d.setDate(d.getDate() + 1);
      }
      // Only return slots in months where client self-booking is activated for this employee
      const filtered = slots.filter((slot) => {
        const key = `${params.employeeId}:${monthKey(new Date(slot.startAt))}`;
        return db.bookingActivations.get(key) === true;
      });
      return filtered.sort((a, b) => a.startAt.localeCompare(b.startAt));
    },

    bookableDays: async (params: { from: string; to: string }): Promise<BookableDay[]> => {
      ensureSeed();
      const fromDate = startOfDay(new Date(params.from));
      const toDate = new Date(params.to);
      const employees = Array.from(db.users.values()).filter((u) => u.role === "EMPLOYEE");
      const result: BookableDay[] = [];
      const day = new Date(fromDate);
      while (day <= toDate) {
        const dateStr = day.toISOString().slice(0, 10);
        const mKey = monthKey(day);
        const hasActivatedMonth = employees.some((emp) => db.bookingActivations.get(`${emp.id}:${mKey}`) === true);
        if (!hasActivatedMonth) {
          day.setDate(day.getDate() + 1);
          continue;
        }
        let total = 0;
        for (const emp of employees) {
          const key = `${emp.id}:${mKey}`;
          if (db.bookingActivations.get(key) !== true) continue;
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          const slots = await this.availability.list({
            employeeId: emp.id,
            from: dayStart.toISOString(),
            to: dayEnd.toISOString(),
          });
          total += slots.length;
        }
        result.push({ date: dateStr, availableCount: total });
        day.setDate(day.getDate() + 1);
      }
      return result;
    },
  };

  bookingActivations = {
    list: async (params: BookingActivationListParams): Promise<{ activations: BookingActivation[] }> => {
      ensureSeed();
      const employees = Array.from(db.users.values()).filter((u) => u.role === "EMPLOYEE");
      const activations: BookingActivation[] = [];
      const [fromY, fromM] = params.fromMonth.split("-").map(Number);
      const [toY, toM] = params.toMonth.split("-").map(Number);
      let y = fromY;
      let m = fromM;
      while (y < toY || (y === toY && m <= toM)) {
        const monthKeyStr = `${y}-${String(m).padStart(2, "0")}`;
        for (const emp of employees) {
          const key = `${emp.id}:${monthKeyStr}`;
          activations.push({
            employeeId: emp.id,
            monthKey: monthKeyStr,
            active: db.bookingActivations.get(key) === true,
          });
        }
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
      return { activations };
    },

    set: async (data: BookingActivationSet): Promise<void> => {
      ensureSeed();
      const key = `${data.employeeId}:${data.monthKey}`;
      db.bookingActivations.set(key, data.active);
    },
  };

  appointments = {
    list: async (params: {
      clientId?: string;
      employeeId?: string;
      from?: string;
      to?: string;
      status?: string;
    }): Promise<Appointment[]> => {
      ensureSeed();
      let list = Array.from(db.appointments.values());
      if (params.clientId) list = list.filter((a) => a.clientId === params.clientId);
      if (params.employeeId) list = list.filter((a) => a.employeeId === params.employeeId);
      if (params.from) list = list.filter((a) => a.startAt >= params.from!);
      if (params.to) list = list.filter((a) => a.endAt <= params.to!);
      if (params.status) list = list.filter((a) => a.status === params.status);
      return list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    },

    get: async (id: string) => db.appointments.get(id) ?? null,

    /**
     * BACKEND CONTRACT (to implement later):
     * POST /appointments
     * Body: AppointmentCreate
     * On create: if client has enough credits => PAID + deduct; else UNPAID
     */
    create: async (data: AppointmentCreate): Promise<Appointment> => {
      ensureSeed();
      const service = db.services.get(data.serviceId);
      if (!service) throw new Error("Service not found");
      const account = db.creditAccounts.get(data.clientId);
      const balance = account?.balanceCzk ?? 0;
      const isClientOnly = !data.employeeId;
      const paymentStatus: PaymentStatus =
        isClientOnly ? "UNPAID" : balance >= service.priceCzk ? "PAID" : "UNPAID";
      const status: AppointmentStatus = "SCHEDULED";
      const id = nextId("app");
      const appointment: Appointment = {
        ...data,
        id,
        status,
        paymentStatus,
      };
      db.appointments.set(id, appointment);
      if (paymentStatus === "PAID" && account && !isClientOnly) {
        account.balanceCzk -= service.priceCzk;
        account.updatedAt = new Date().toISOString();
        const tx: CreditTransaction = {
          id: nextId("tx"),
          clientId: data.clientId,
          amountCzk: -service.priceCzk,
          reason: "Platba za termín",
          appointmentId: id,
          createdAt: new Date().toISOString(),
        };
        db.creditTransactions.set(tx.id, tx);
      }
      return appointment;
    },

    /**
     * BACKEND CONTRACT (to implement later):
     * POST /appointments/blocks
     * Body: TherapyBlockCreate (slots array; breaks between slots allowed).
     * Creates one appointment per slot with same blockId; notification system treats as one.
     * Admin/Reception only.
     */
    createBlock: async (data: TherapyBlockCreate): Promise<{ blockId: string; appointments: Appointment[] }> => {
      ensureSeed();
      const blockId = nextId("block");
      const service = db.services.get(data.serviceId);
      if (!service) throw new Error("Service not found");
      const room = db.rooms.get(data.roomId);
      if (!room) throw new Error("Room not found");
      const appointments: Appointment[] = [];
      for (const slot of data.slots) {
        const createData: AppointmentCreate = {
          clientId: data.clientId,
          employeeId: data.employeeId,
          serviceId: data.serviceId,
          roomId: data.roomId,
          startAt: slot.startAt,
          endAt: slot.endAt,
          blockId,
        };
        const app = await this.appointments.create(createData);
        appointments.push(app);
      }
      const firstStart = data.slots[0]?.startAt ?? "";
      const n: Notification = {
        id: nextId("n"),
        channel: "IN_APP",
        title: "Intenzivní blok rezervován",
        message: `Rezervován intenzivní blok (${data.slots.length} slotů) od ${firstStart.slice(0, 16)}.`,
        read: false,
        createdAt: new Date().toISOString(),
        blockId,
      };
      db.notifications.set(n.id, n);
      return { blockId, appointments };
    },

    update: async (id: string, data: AppointmentUpdate): Promise<Appointment> => {
      ensureSeed();
      const a = db.appointments.get(id);
      if (!a) throw new Error("Appointment not found");
      const updated = { ...a, ...data };
      db.appointments.set(id, updated);
      return updated;
    },

    /**
     * BACKEND CONTRACT (to implement later):
     * POST /appointments/:id/cancel
     * Body: { refund?: boolean, reason?: string }
     * Returns: { appointment, creditTransaction? }
     * Refund if paid and within freeCancelHours; reception can override with reason.
     */
    cancel: async (
      id: string,
      body?: AppointmentCancelBody
    ): Promise<{ appointment: Appointment; creditTransaction?: CreditTransaction }> => {
      ensureSeed();
      const a = db.appointments.get(id);
      if (!a) throw new Error("Appointment not found");
      if (a.status === "CANCELLED") throw new Error("Already cancelled");
      const service = db.services.get(a.serviceId);
      const price = service?.priceCzk ?? 0;
      const freeCancelHours = db.settings.freeCancelHours;
      const eligibleRefund = canRefund(a.paymentStatus, a.startAt, freeCancelHours);
      const doRefund = body?.refund ?? eligibleRefund;
      const updated: Appointment = {
        ...a,
        status: "CANCELLED",
        paymentStatus: doRefund ? "REFUNDED" : a.paymentStatus,
        cancelReason: body?.reason ?? "",
        cancelledAt: new Date().toISOString(),
      };
      db.appointments.set(id, updated);
      let creditTransaction: CreditTransaction | undefined;
      if (doRefund && price > 0) {
        const account = db.creditAccounts.get(a.clientId);
        if (account) {
          account.balanceCzk += price;
          account.updatedAt = new Date().toISOString();
          creditTransaction = {
            id: nextId("tx"),
            clientId: a.clientId,
            amountCzk: price,
            reason: "Vrácení za zrušený termín",
            appointmentId: id,
            createdAt: new Date().toISOString(),
          };
          db.creditTransactions.set(creditTransaction.id, creditTransaction);
        }
      }
      return { appointment: updated, creditTransaction };
    },

    complete: async (id: string): Promise<Appointment> => {
      ensureSeed();
      const a = db.appointments.get(id);
      if (!a) throw new Error("Appointment not found");
      const updated = { ...a, status: "COMPLETED" as const };
      db.appointments.set(id, updated);
      return updated;
    },
  };

  credits = {
    get: async (clientId: string): Promise<CreditAccount> => {
      ensureSeed();
      const acc = db.creditAccounts.get(clientId);
      if (!acc) return { clientId, balanceCzk: 0, updatedAt: new Date().toISOString() };
      return acc;
    },
    getTransactions: async (clientId: string): Promise<CreditTransaction[]> => {
      ensureSeed();
      return Array.from(db.creditTransactions.values())
        .filter((t) => t.clientId === clientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    /**
     * BACKEND CONTRACT (to implement later):
     * POST /credits/:clientId/adjust
     * Body: { amountCzk, reason }
     */
    adjust: async (clientId: string, body: CreditAdjustBody): Promise<CreditTransaction> => {
      ensureSeed();
      let acc = db.creditAccounts.get(clientId);
      if (!acc) {
        acc = { clientId, balanceCzk: 0, updatedAt: new Date().toISOString() };
        db.creditAccounts.set(clientId, acc);
      }
      acc.balanceCzk += body.amountCzk;
      acc.updatedAt = new Date().toISOString();
      const tx: CreditTransaction = {
        id: nextId("tx"),
        clientId,
        amountCzk: body.amountCzk,
        reason: body.reason,
        createdAt: new Date().toISOString(),
      };
      db.creditTransactions.set(tx.id, tx);
      appendClientProfileLog(
        clientId,
        "DATA_CHANGE",
        "Úprava kreditu",
        `${body.amountCzk >= 0 ? "+" : ""}${body.amountCzk} Kč: ${body.reason}`,
        this.session?.userId
      );
      return tx;
    },
  };

  billing = {
    /**
     * BACKEND CONTRACT (to implement later):
     * POST /billing/reports
     * Body: { period: { year, month } }
     * Returns: BillingReport with unpaid appointments in that period
     */
    generateMonthly: async (period: BillingPeriod): Promise<BillingReport> => {
      ensureSeed();
      const from = new Date(period.year, period.month - 1, 1).toISOString();
      const to = new Date(period.year, period.month, 0, 23, 59, 59).toISOString();
      const unpaid = Array.from(db.appointments.values()).filter(
        (a) => a.paymentStatus === "UNPAID" && a.status !== "CANCELLED" && a.startAt >= from && a.startAt <= to
      );
      const perClientTotals = new Map<string, number>();
      const servicePrices = new Map(db.services.entries());
      for (const a of unpaid) {
        const s = servicePrices.get(a.serviceId);
        const price = s?.priceCzk ?? 0;
        perClientTotals.set(a.clientId, (perClientTotals.get(a.clientId) ?? 0) + price);
      }
      const totalUnpaidCzk = Array.from(perClientTotals.values()).reduce((s, v) => s + v, 0);
      const id = nextId("bill");
      const report: BillingReport = {
        id,
        periodYear: period.year,
        periodMonth: period.month,
        unpaidAppointments: unpaid,
        totalUnpaidCzk,
        perClientTotals: Array.from(perClientTotals.entries()).map(([clientId, totalCzk]) => ({ clientId, totalCzk })),
        createdAt: new Date().toISOString(),
      };
      db.billingReports.set(id, report);
      return report;
    },

    getReport: async (id: string) => db.billingReports.get(id) ?? null,

    exportCsv: async (reportId: string): Promise<string> => {
      ensureSeed();
      const report = db.billingReports.get(reportId);
      if (!report) throw new Error("Report not found");
      const header = "clientId;totalCzk;appointmentIds\n";
      const rows = report.perClientTotals.map(
        (p) =>
          `${p.clientId};${p.totalCzk};${report.unpaidAppointments.filter((a) => a.clientId === p.clientId).map((a) => a.id).join(",")}`
      );
      return header + rows.join("\n");
    },

    /**
     * BACKEND CONTRACT (to implement later):
     * POST /billing/reports/:id/mark-invoiced
     * Body: { appointmentIds: string[] }
     * Updates appointment paymentStatus to INVOICED
     */
    markInvoiced: async (appointmentIds: string[]): Promise<void> => {
      ensureSeed();
      for (const id of appointmentIds) {
        const a = db.appointments.get(id);
        if (a) {
          a.paymentStatus = "INVOICED";
          a.status = "INVOICED";
          db.appointments.set(id, a);
        }
      }
    },
  };

  invoices = {
    list: async (params?: InvoiceListParams): Promise<Invoice[]> => {
      ensureSeed();
      let list = Array.from(db.invoices.values());
      if (params?.clientId) list = list.filter((i) => i.clientId === params.clientId);
      if (params?.status) list = list.filter((i) => i.status === params.status);
      if (params?.from) list = list.filter((i) => i.issueDate >= params.from!);
      if (params?.to) list = list.filter((i) => i.issueDate <= params.to!);
      return list.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
    },

    get: async (id: string) => db.invoices.get(id) ?? null,

    create: async (data: InvoiceCreate): Promise<Invoice> => {
      ensureSeed();
      const client = db.users.get(data.clientId);
      if (!client) throw new Error("Client not found");
      const firstName = client.firstName ?? client.name.split(" ")[0] ?? "";
      const lastName = client.lastName ?? client.name.split(" ").slice(1).join(" ") ?? "";
      const addr = client.billingAddress;
      if (!addr?.street || !addr?.city || !addr?.zip) {
        throw new Error(
          "Pro vygenerování faktury vyplňte u klienta: jméno, příjmení, ulici, město a PSČ (Nastavení klienta / adresa)."
        );
      }
      const recipient: InvoiceRecipient = {
        firstName,
        lastName,
        street: addr.street,
        city: addr.city,
        zip: addr.zip,
        country: addr.country ?? "CZ",
        phone: client.phone,
      };
      const settings = db.settings;
      const prefix = settings.invoiceNumberPrefix ?? "F";
      const nextNum = settings.invoiceNumberNext ?? 1;
      const number = `${prefix}-${String(nextNum).padStart(6, "0")}`;
      (db.settings as Record<string, unknown>).invoiceNumberNext = nextNum + 1;
      const issueDate = new Date().toISOString().slice(0, 10);
      const dueDays = settings.invoiceDueDays ?? 14;
      const dueDate = data.dueDate ?? addDays(new Date(), dueDays).toISOString().slice(0, 10);
      const appointments = data.appointmentIds.map((id) => db.appointments.get(id)).filter(Boolean) as Appointment[];
      const servicePrices = new Map(db.services.entries());
      const amountCzk = appointments.reduce((sum, a) => sum + (servicePrices.get(a.serviceId)?.priceCzk ?? 0), 0);
      const id = nextId("inv");
      const invoice: Invoice = {
        id,
        clientId: data.clientId,
        number,
        dueDate,
        issueDate,
        amountCzk,
        status: "DRAFT",
        appointmentIds: data.appointmentIds,
        issuer: settings.invoiceIssuer,
        recipient,
        createdAt: new Date().toISOString(),
      };
      db.invoices.set(id, invoice);
      return invoice;
    },

    update: async (id: string, data: InvoiceUpdate): Promise<Invoice> => {
      ensureSeed();
      const inv = db.invoices.get(id);
      if (!inv) throw new Error("Invoice not found");
      const recipient = data.recipient ? { ...inv.recipient, ...data.recipient } : inv.recipient;
      const updated: Invoice = { ...inv, ...data, recipient };
      db.invoices.set(id, updated);
      return updated;
    },

    send: async (invoiceId: string): Promise<void> => {
      ensureSeed();
      const inv = db.invoices.get(invoiceId);
      if (!inv) throw new Error("Invoice not found");
      inv.status = "SENT";
      inv.sentAt = new Date().toISOString();
      db.invoices.set(invoiceId, inv);
    },

    sendBulk: async (invoiceIds: string[]): Promise<void> => {
      ensureSeed();
      for (const invoiceId of invoiceIds) {
        const inv = db.invoices.get(invoiceId);
        if (inv) {
          inv.status = "SENT" as InvoiceStatus;
          inv.sentAt = new Date().toISOString();
          db.invoices.set(invoiceId, inv);
        }
      }
    },

    /** Placeholder: find overdue (SENT, dueDate < today) invoices and "send" reminder (e.g. create notification). */
    sendOverdueReminders: async (): Promise<{ sent: number }> => {
      ensureSeed();
      const today = new Date().toISOString().slice(0, 10);
      let sent = 0;
      for (const inv of Array.from(db.invoices.values())) {
        if (inv.status === "SENT" && inv.dueDate < today) {
          const n: Notification = {
            id: nextId("n"),
            userId: inv.clientId,
            channel: "EMAIL",
            message: `Upomínka: Faktura ${inv.number} je po splatnosti (${inv.dueDate}).`,
            title: "Upomínka k faktuře",
            read: false,
            createdAt: new Date().toISOString(),
          };
          db.notifications.set(n.id, n);
          sent += 1;
        }
      }
      return { sent };
    },
  };

  bankTransactions = {
    /** Placeholder: in mock no FIO API; return empty. Backend will call FIO API and store. */
    list: async (params: BankTransactionListParams): Promise<BankTransaction[]> => {
      ensureSeed();
      return [];
    },
    /** Placeholder: backend would call FIO Bank API and import movements. */
    sync: async (_params: BankTransactionListParams): Promise<{ imported: number }> => {
      ensureSeed();
      return { imported: 0 };
    },
    /** Placeholder: mark invoice PAID and link transaction. */
    match: async (invoiceId: string, _transactionId: string): Promise<void> => {
      ensureSeed();
      const inv = db.invoices.get(invoiceId);
      if (!inv) throw new Error("Invoice not found");
      inv.status = "PAID" as InvoiceStatus;
      inv.paidAt = new Date().toISOString();
      db.invoices.set(invoiceId, inv);
    },
  };

  waitlist = {
    list: async () => {
      ensureSeed();
      return Array.from(db.waitlist.values()).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    },
    create: async (data: Omit<WaitingListEntry, "id" | "createdAt">): Promise<WaitingListEntry> => {
      ensureSeed();
      const id = nextId("w");
      const entry: WaitingListEntry = { ...data, id, createdAt: new Date().toISOString() };
      db.waitlist.set(id, entry);
      return entry;
    },
    update: async (id: string, data: Partial<WaitingListEntry>): Promise<WaitingListEntry> => {
      ensureSeed();
      const w = db.waitlist.get(id);
      if (!w) throw new Error("Waitlist entry not found");
      const updated = { ...w, ...data };
      db.waitlist.set(id, updated);
      return updated;
    },
    /**
     * BACKEND CONTRACT (to implement later):
     * GET /waitlist/suggestions?slotStart=&slotEnd=&serviceId=
     * Returns scored suggestions for a freed slot
     */
    suggestions: async (params: {
      slotStart: string;
      slotEnd: string;
      serviceId?: string;
    }): Promise<WaitlistSuggestion[]> => {
      ensureSeed();
      let entries = Array.from(db.waitlist.values());
      if (params.serviceId) entries = entries.filter((e) => e.serviceId === params.serviceId);
      return entries.map((entry, i) => ({
        entry,
        score: 100 - i * 10,
        scoreReasons: ["Na čekací listě", "Priorita"],
        priorityBucket: i === 0 ? "high" : "normal",
      }));
    },
    notify: async (entryId: string): Promise<void> => {
      ensureSeed();
      const entry = db.waitlist.get(entryId);
      if (!entry) return;
      const n: Notification = {
        id: nextId("n"),
        userId: entry.clientId,
        channel: "IN_APP",
        message: "Nabídka volného termínu",
        read: false,
        createdAt: new Date().toISOString(),
      };
      db.notifications.set(n.id, n);
    },
  };

  reports = {
    upload: async (clientId: string, file: File): Promise<ReportUploadResult> => {
      ensureSeed();
      const id = nextId("rep");
      const rec: TherapyReportFile = {
        id,
        clientId,
        uploadedBy: this.session?.userId ?? "unknown",
        fileName: file.name,
        mimeType: file.type,
        visibleToClient: false,
        createdAt: new Date().toISOString(),
      };
      db.therapyReports.set(id, rec);
      db.therapyReportBlobs.set(id, file);
      return { id, fileName: file.name, createdAt: rec.createdAt };
    },
    list: async (clientId: string) => {
      ensureSeed();
      return Array.from(db.therapyReports.values())
        .filter((r) => r.clientId === clientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    download: async (id: string): Promise<Blob> => {
      ensureSeed();
      const blob = db.therapyReportBlobs.get(id);
      if (blob) return blob;
      const rec = db.therapyReports.get(id);
      if (!rec) throw new Error("Report not found");
      return new Blob([`Placeholder PDF for ${rec.fileName}`], { type: "application/pdf" });
    },
    updateVisibility: async (id: string, data: ReportVisibilityUpdate): Promise<TherapyReportFile> => {
      ensureSeed();
      const r = db.therapyReports.get(id);
      if (!r) throw new Error("Report not found");
      const updated = { ...r, ...data };
      db.therapyReports.set(id, updated);
      return updated;
    },
  };

  medicalReports = {
    list: async (clientId: string): Promise<MedicalReport[]> => {
      ensureSeed();
      return Array.from(db.medicalReports.values())
        .filter((r) => r.clientId === clientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    create: async (data: MedicalReportCreate): Promise<MedicalReport> => {
      ensureSeed();
      if (this.session?.role !== "EMPLOYEE" && this.session?.role !== "ADMIN") {
        throw new Error("Pouze terapeut nebo administrátor může vytvářet lékařské zprávy.");
      }
      const client = db.users.get(data.clientId);
      if (!client) throw new Error("Klient nenalezen.");
      const fullName = [client.firstName ?? "", client.lastName ?? ""].filter(Boolean).join(" ") || client.name;
      const address = client.billingAddress
        ? [client.billingAddress.street, client.billingAddress.city, client.billingAddress.zip, client.billingAddress.country].filter(Boolean).join(", ")
        : "";
      const reportDate = new Date().toISOString().slice(0, 10);
      const id = nextId("medrep");
      const report: MedicalReport = {
        id,
        clientId: data.clientId,
        createdBy: this.session?.userId ?? "unknown",
        createdAt: new Date().toISOString(),
        clientFullName: fullName,
        clientAddress: address,
        childName: client.childName ?? undefined,
        childDateOfBirth: client.childDateOfBirth ?? undefined,
        reportDate,
        diagnosis: data.diagnosis ?? undefined,
        currentCondition: data.currentCondition ?? undefined,
        plannedTreatment: data.plannedTreatment ?? undefined,
        recommendations: data.recommendations ?? undefined,
      };
      db.medicalReports.set(id, report);
      return report;
    },
    get: async (id: string): Promise<MedicalReport | null> => {
      ensureSeed();
      return db.medicalReports.get(id) ?? null;
    },
    exportPdf: async (id: string): Promise<Blob> => {
      ensureSeed();
      const r = db.medicalReports.get(id);
      if (!r) throw new Error("Zpráva nenalezena.");
      const text = [
        `Lékařská zpráva – ${r.clientFullName}`,
        `Datum: ${r.reportDate}`,
        `Adresa: ${r.clientAddress}`,
        r.childName ? `Jméno dítěte: ${r.childName}` : "",
        r.childDateOfBirth ? `Datum narození dítěte: ${r.childDateOfBirth}` : "",
        r.diagnosis ? `Diagnóza: ${r.diagnosis}` : "",
        r.currentCondition ? `Aktuální stav: ${r.currentCondition}` : "",
        r.plannedTreatment ? `Plánovaná léčba: ${r.plannedTreatment}` : "",
        r.recommendations ? `Doporučení: ${r.recommendations}` : "",
      ].filter(Boolean).join("\n\n");
      return new Blob([text], { type: "application/pdf" });
    },
    exportDocx: async (id: string): Promise<Blob> => {
      ensureSeed();
      const r = db.medicalReports.get(id);
      if (!r) throw new Error("Zpráva nenalezena.");
      const text = [
        `Lékařská zpráva – ${r.clientFullName}`,
        `Datum: ${r.reportDate}`,
        `Adresa: ${r.clientAddress}`,
        r.childName ? `Jméno dítěte: ${r.childName}` : "",
        r.childDateOfBirth ? `Datum narození dítěte: ${r.childDateOfBirth}` : "",
        r.diagnosis ? `Diagnóza: ${r.diagnosis}` : "",
        r.currentCondition ? `Aktuální stav: ${r.currentCondition}` : "",
        r.plannedTreatment ? `Plánovaná léčba: ${r.plannedTreatment}` : "",
        r.recommendations ? `Doporučení: ${r.recommendations}` : "",
      ].filter(Boolean).join("\n\n");
      return new Blob([text], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    },
  };

  behavior = {
    getClientScores: async (clientIds?: string[]): Promise<ClientBehaviorScore[]> => {
      ensureSeed();
      const clients = clientIds?.length
        ? Array.from(db.users.values()).filter((u) => u.role === "CLIENT" && clientIds.includes(u.id))
        : Array.from(db.users.values()).filter((u) => u.role === "CLIENT");
      const appointments = Array.from(db.appointments.values());
      const events = deriveEventsFromAppointments(appointments);
      const result: ClientBehaviorScore[] = [];
      for (const client of clients) {
        const clientEvents = events.filter((e) => e.clientId === client.id);
        const profile = computeBehaviorProfile(client.id, clientEvents);
        result.push({
          clientId: client.id,
          reliabilityScore: profile.scores.reliabilityScore,
          cancellationRiskScore: profile.scores.cancellationRiskScore,
          reactivityScore: profile.scores.reactivityScore,
          fillHelperScore: profile.scores.fillHelperScore,
        });
      }
      return result;
    },
  };

  notifications = {
    list: async (params?: { read?: boolean; limit?: number; appointmentId?: string; blockId?: string }) => {
      ensureSeed();
      let list = Array.from(db.notifications.values());
      if (params?.read !== undefined) list = list.filter((n) => n.read === params.read);
      if (params?.appointmentId) list = list.filter((n) => n.appointmentId === params.appointmentId);
      if (params?.blockId) list = list.filter((n) => n.blockId === params.blockId);
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const limit = params?.limit ?? 50;
      return list.slice(0, limit);
    },
    send: async (body: NotificationSendBody): Promise<void> => {
      ensureSeed();
      const n: Notification = {
        id: nextId("n"),
        channel: body.channel,
        message: body.message,
        title: body.title,
        read: false,
        createdAt: new Date().toISOString(),
        appointmentId: body.appointmentId,
        blockId: body.blockId,
      };
      db.notifications.set(n.id, n);
    },
    read: async (id: string): Promise<void> => {
      ensureSeed();
      const n = db.notifications.get(id);
      if (n) {
        n.read = true;
        db.notifications.set(id, n);
      }
    },
    sendBulk: async (body: NotificationBulkSendBody): Promise<{ sent: number }> => {
      ensureSeed();
      let sent = 0;
      for (const clientId of body.clientIds) {
        const user = db.users.get(clientId);
        if (!user) continue;
        const n: Notification = {
          id: nextId("n"),
          userId: clientId,
          channel: body.channel,
          message: body.message,
          title: body.title ?? (body.channel === "EMAIL" ? body.subject : undefined),
          read: false,
          createdAt: new Date().toISOString(),
        };
        db.notifications.set(n.id, n);
        appendClientProfileLog(
          clientId,
          "NOTIFICATION_SENT",
          `Odesláno: ${body.channel}`,
          body.title ?? body.message.slice(0, 50),
          this.session?.userId
        );
        sent += 1;
      }
      return { sent };
    },
  };

  pushSubscriptions = {
    subscribe: async (body: PushSubscribeBody): Promise<PushSubscription> => {
      ensureSeed();
      const userId = this.session?.userId;
      if (!userId) throw new Error("Unauthorized");
      const existing = Array.from(db.pushSubscriptions.values()).find((s) => s.endpoint === body.endpoint);
      if (existing) return existing;
      const sub: PushSubscription = {
        id: nextId("push"),
        userId,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent,
        createdAt: new Date().toISOString(),
      };
      db.pushSubscriptions.set(sub.endpoint, sub);
      return sub;
    },
    unsubscribe: async (endpoint: string): Promise<void> => {
      ensureSeed();
      db.pushSubscriptions.delete(endpoint);
    },
    list: async (): Promise<PushSubscription[]> => {
      ensureSeed();
      const userId = this.session?.userId;
      if (!userId) return [];
      return Array.from(db.pushSubscriptions.values()).filter((s) => s.userId === userId);
    },
  };

  push = {
    getConfig: async (): Promise<{ vapidPublicKey: string | null }> => {
      ensureSeed();
      const key = db.settings.pushNotificationConfig?.vapidPublicKey ?? null;
      return { vapidPublicKey: key };
    },
    sendTestPush: async (): Promise<{ sent: number; total: number; errors?: string[] }> => {
      ensureSeed();
      const total = Array.from(db.pushSubscriptions.values()).length;
      return { sent: 0, total };
    },
  };

  settings = {
    get: async (): Promise<Settings> => {
      ensureSeed();
      if (typeof window !== "undefined") {
        try {
          const saved = window.localStorage.getItem(MOCK_SETTINGS_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved) as Partial<Settings>;
            db.settings = { ...db.settings, ...parsed };
          }
        } catch {
          // ignore invalid or missing stored settings
        }
      }
      return { ...db.settings };
    },
    update: async (data: SettingsUpdate): Promise<Settings> => {
      ensureSeed();
      db.settings = { ...db.settings, ...data };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(MOCK_SETTINGS_STORAGE_KEY, JSON.stringify(db.settings));
        } catch {
          // ignore quota or other storage errors
        }
      }
      return { ...db.settings };
    },
    getEmailStatus: async (): Promise<{ ok: boolean; message: string; details?: string }> => {
      ensureSeed();
      const sender = db.settings.notificationEmailSender;
      if (!sender?.email?.trim()) {
        return {
          ok: false,
          message: "E-mail není dostupný",
          details: "Vyplňte e-mail odesílatele v sekci „Oznámení – odesílatel e-mailů“ a uložte nastavení.",
        };
      }
      return {
        ok: true,
        message: "E-mail je připraven (mock – reálné odesílání v režimu http)",
        details: `Odesílatel: ${sender.name ? `${sender.name} <${sender.email}>` : sender.email}.`,
      };
    },
    sendTestEmail: async (body: TestEmailBody): Promise<{ sent: true; to: string }> => {
      ensureSeed();
      // V mocku e-mail neodesíláme; v reálném režimu (http) volá backend POST /settings/test-email.
      return { sent: true, to: body.to };
    },
  };

  stats = {
    occupancy: async (params: { from: string; to: string }): Promise<OccupancyStat[]> => {
      ensureSeed();
      const list = Array.from(db.appointments.values()).filter(
        (a) => a.status !== "CANCELLED" && a.startAt >= params.from && a.endAt <= params.to
      );
      const byDay = new Map<string, { total: number; booked: number }>();
      for (const a of list) {
        const day = a.startAt.slice(0, 10);
        const cur = byDay.get(day) ?? { total: 8, booked: 0 };
        cur.booked += 1;
        byDay.set(day, cur);
      }
      return Array.from(byDay.entries()).map(([date, v]) => ({
        date,
        totalSlots: v.total,
        bookedSlots: v.booked,
        occupancyPercent: Math.round((v.booked / v.total) * 100),
      }));
    },
    cancellations: async (params: { from: string; to: string }): Promise<CancellationStat[]> => {
      ensureSeed();
      const cancelled = Array.from(db.appointments.values()).filter(
        (a) => a.status === "CANCELLED" && a.cancelledAt && a.cancelledAt >= params.from && a.cancelledAt <= params.to
      );
      const withRefund = cancelled.filter((a) => a.paymentStatus === "REFUNDED").length;
      return [{ period: `${params.from}–${params.to}`, count: cancelled.length, withRefund }];
    },
    clientTags: async (): Promise<ClientTagStat[]> => {
      ensureSeed();
      return [{ tag: "aktivní", count: db.users.size }, { tag: "čekací list", count: db.waitlist.size }];
    },
  };

  admin = {
    getBehaviorEvaluations: async (): Promise<BehaviorEvaluationRecord[]> => {
      ensureSeed();
      return [...db.behaviorEvaluations].sort(
        (a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
      );
    },
    getSentCommunications: async (params?: SentCommunicationListParams): Promise<SentCommunication[]> => {
      ensureSeed();
      const notifications = Array.from(db.notifications.values()).filter(
        (n) => n.channel === "EMAIL" || n.channel === "SMS"
      ) as (Notification & { userId?: string })[];
      const list: SentCommunication[] = notifications.map((n) => {
        const userId = n.userId ?? (n as Notification & { clientId?: string }).clientId;
        const user = userId ? db.users.get(userId) : undefined;
        return {
          id: n.id,
          channel: n.channel as "EMAIL" | "SMS",
          recipientId: userId ?? "",
          recipientName: user?.name ?? "—",
          sentAt: n.createdAt,
          subject: n.title,
          messageText: n.message,
        };
      });
      let filtered = list;
      if (params?.recipientName) {
        const q = params.recipientName.toLowerCase();
        filtered = filtered.filter((c) => c.recipientName.toLowerCase().includes(q));
      }
      if (params?.from) {
        const fromVal = params.from.length === 10 ? `${params.from}T00:00:00.000Z` : params.from;
        filtered = filtered.filter((c) => c.sentAt >= fromVal);
      }
      if (params?.to) {
        const toVal = params.to.length === 10 ? `${params.to}T23:59:59.999Z` : params.to;
        filtered = filtered.filter((c) => c.sentAt <= toVal);
      }
      if (params?.messageText) {
        const q = params.messageText.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.messageText.toLowerCase().includes(q) ||
            (c.subject ?? "").toLowerCase().includes(q)
        );
      }
      filtered.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      return filtered;
    },
    getRecommendations: async (): Promise<ClientRecommendation[]> => {
      ensureSeed();
      const users = Array.from(db.users.values());
      const appointments = Array.from(db.appointments.values());
      const waitlist = Array.from(db.waitlist.values());
      return computeRecommendations({ users, appointments, waitlist });
    },

    resetClientPassword: async (body: ResetPasswordByAdminBody): Promise<void> => {
      ensureSeed();
      if (this.session?.role !== "ADMIN") throw new Error("Pouze administrátor může resetovat heslo.");
      const client = db.users.get(body.clientId);
      if (!client || client.role !== "CLIENT") throw new Error("Klient nenalezen.");
      appendClientProfileLog(
        body.clientId,
        "PASSWORD_RESET_REQUESTED",
        "Administrátor vyžádal reset hesla",
        body.message,
        this.session.userId
      );
      const emailNotif: Notification = {
        id: nextId("n"),
        userId: body.clientId,
        channel: "EMAIL",
        title: "Nastavení nového hesla",
        message: "Byl vyžádán reset hesla. Pro nastavení nového hesla použijte odkaz v tomto e-mailu (backend: implementovat odkaz).",
        read: false,
        createdAt: new Date().toISOString(),
      };
      db.notifications.set(emailNotif.id, emailNotif);
    },
  };
}
