/**
 * SQLite schema for persistent storage. Production-ready single-file DB.
 */
import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  active: integer("active", { mode: "boolean" }).default(true),
  createdAt: text("created_at"),
  workingHoursJson: text("working_hours_json"),
  lunchBreaksJson: text("lunch_breaks_json"),
  defaultPricePerSessionCzk: integer("default_price_per_session_czk"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  childName: text("child_name"),
  billingAddressJson: text("billing_address_json"),
  notificationPreferencesJson: text("notification_preferences_json"),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  priceCzk: integer("price_czk").notNull(),
  active: integer("active", { mode: "boolean" }).default(true),
});

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  active: integer("active", { mode: "boolean" }).default(true),
});

export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  employeeId: text("employee_id"),
  serviceId: text("service_id").notNull(),
  roomId: text("room_id").notNull(),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  status: text("status").notNull(),
  paymentStatus: text("payment_status").notNull(),
  internalNotes: text("internal_notes"),
  cancelReason: text("cancel_reason"),
  cancelledAt: text("cancelled_at"),
  blockId: text("block_id"),
});

export const creditAccounts = sqliteTable("credit_accounts", {
  clientId: text("client_id").primaryKey(),
  balanceCzk: integer("balance_czk").notNull(),
  updatedAt: text("updated_at"),
});

export const creditTransactions = sqliteTable("credit_transactions", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  amountCzk: integer("amount_czk").notNull(),
  reason: text("reason").notNull(),
  appointmentId: text("appointment_id"),
  createdAt: text("created_at").notNull(),
});

export const billingReports = sqliteTable("billing_reports", {
  id: text("id").primaryKey(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  unpaidAppointmentsJson: text("unpaid_appointments_json").notNull(),
  totalUnpaidCzk: integer("total_unpaid_czk").notNull(),
  perClientTotalsJson: text("per_client_totals_json").notNull(),
  createdAt: text("created_at"),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  number: text("number").notNull(),
  dueDate: text("due_date").notNull(),
  issueDate: text("issue_date").notNull(),
  amountCzk: integer("amount_czk").notNull(),
  status: text("status").notNull(),
  appointmentIdsJson: text("appointment_ids_json").notNull(),
  issuerJson: text("issuer_json"),
  recipientJson: text("recipient_json").notNull(),
  createdAt: text("created_at"),
  sentAt: text("sent_at"),
  paidAt: text("paid_at"),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  channel: text("channel").notNull(),
  title: text("title"),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull(),
  appointmentId: text("appointment_id"),
  blockId: text("block_id"),
});

export const therapyReports = sqliteTable("therapy_reports", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type"),
  visibleToClient: integer("visible_to_client", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull(),
});

export const therapyReportBlobs = sqliteTable("therapy_report_blobs", {
  id: text("id").primaryKey(),
  blob: text("blob"), // SQLite stores BLOB; we use text base64 for simplicity with Drizzle
});

export const waitlist = sqliteTable("waitlist", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  serviceId: text("service_id").notNull(),
  preferredDaysJson: text("preferred_days_json"),
  preferredTimeStart: text("preferred_time_start"),
  preferredTimeEnd: text("preferred_time_end"),
  priority: integer("priority"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  freeCancelHours: integer("free_cancel_hours").notNull(),
  businessHoursStart: text("business_hours_start"),
  businessHoursEnd: text("business_hours_end"),
  invoiceNumberPrefix: text("invoice_number_prefix"),
  invoiceNumberNext: integer("invoice_number_next").notNull(),
  invoiceDueDays: integer("invoice_due_days"),
  invoiceIssuerJson: text("invoice_issuer_json"),
  notificationEmailSenderJson: text("notification_email_sender_json"),
  smsFaynConfigJson: text("sms_fayn_config_json"),
  reservationNotificationTimingJson: text("reservation_notification_timing_json"),
  pushNotificationConfigJson: text("push_notification_config_json"),
});

export const bookingActivations = sqliteTable(
  "booking_activations",
  {
    employeeId: text("employee_id").notNull(),
    monthKey: text("month_key").notNull(),
    active: integer("active", { mode: "boolean" }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.employeeId, t.monthKey] }),
  })
);

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: text("created_at"),
});
