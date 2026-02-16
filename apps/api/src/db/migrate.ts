/**
 * Run schema migrations (CREATE TABLE IF NOT EXISTS). Safe to run on every startup.
 */
import { initDb } from "./client.js";

const initialSql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT,
  working_hours_json TEXT,
  lunch_breaks_json TEXT,
  default_price_per_session_czk INTEGER,
  first_name TEXT,
  last_name TEXT,
  child_name TEXT,
  billing_address_json TEXT,
  notification_preferences_json TEXT
);

CREATE TABLE IF NOT EXISTS user_passwords (
  user_id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_czk INTEGER NOT NULL,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  employee_id TEXT,
  service_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  internal_notes TEXT,
  cancel_reason TEXT,
  cancelled_at TEXT,
  block_id TEXT
);

CREATE TABLE IF NOT EXISTS credit_accounts (
  client_id TEXT PRIMARY KEY,
  balance_czk INTEGER NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  amount_czk INTEGER NOT NULL,
  reason TEXT NOT NULL,
  appointment_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_reports (
  id TEXT PRIMARY KEY,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  unpaid_appointments_json TEXT NOT NULL,
  total_unpaid_czk INTEGER NOT NULL,
  per_client_totals_json TEXT NOT NULL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  number TEXT NOT NULL,
  due_date TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  amount_czk INTEGER NOT NULL,
  status TEXT NOT NULL,
  appointment_ids_json TEXT NOT NULL,
  issuer_json TEXT,
  recipient_json TEXT NOT NULL,
  created_at TEXT,
  sent_at TEXT,
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  channel TEXT NOT NULL,
  title TEXT,
  message TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  appointment_id TEXT,
  block_id TEXT
);

CREATE TABLE IF NOT EXISTS therapy_reports (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  visible_to_client INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS therapy_report_blobs (
  id TEXT PRIMARY KEY,
  blob TEXT
);

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  preferred_days_json TEXT,
  preferred_time_start TEXT,
  preferred_time_end TEXT,
  priority INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  free_cancel_hours INTEGER NOT NULL,
  business_hours_start TEXT,
  business_hours_end TEXT,
  invoice_number_prefix TEXT,
  invoice_number_next INTEGER NOT NULL,
  invoice_due_days INTEGER,
  invoice_issuer_json TEXT,
  notification_email_sender_json TEXT,
  sms_fayn_config_json TEXT,
  reservation_notification_timing_json TEXT,
  push_notification_config_json TEXT
);

CREATE TABLE IF NOT EXISTS booking_activations (
  employee_id TEXT NOT NULL,
  month_key TEXT NOT NULL,
  active INTEGER NOT NULL,
  PRIMARY KEY (employee_id, month_key)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT
);
`;

export function runMigrations(): void {
  const sqlite = initDb();
  sqlite.exec(initialSql);
  try {
    sqlite.exec("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0");
  } catch {
    // Column already exists
  }
  try {
    sqlite.exec("ALTER TABLE notifications ADD COLUMN purpose TEXT");
  } catch {
    // Column already exists
  }
  sqlite.exec(`
CREATE TABLE IF NOT EXISTS behavior_reset_log (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  performed_at TEXT NOT NULL,
  reason TEXT,
  previous_scores_json TEXT
)`);
  sqlite.exec(`
CREATE TABLE IF NOT EXISTS slot_offer_approvals (
  id TEXT PRIMARY KEY,
  appointment_ids_json TEXT NOT NULL,
  client_ids_json TEXT NOT NULL,
  message_template TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  decided_by TEXT,
  decided_at TEXT
)`);
  try {
    sqlite.exec("ALTER TABLE settings ADD COLUMN behavior_slot_offer_mode TEXT");
  } catch {}
  try {
    sqlite.exec("ALTER TABLE settings ADD COLUMN approval_notify_emails_json TEXT");
  } catch {}
}
