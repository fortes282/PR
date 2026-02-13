/**
 * SMSAPI.com (https://www.smsapi.com/docs): OAuth Bearer token, POST sms.do.
 * Token z env SMSAPI_TOKEN. Konfigurace odesílatele z store.settings.smsSmsapiConfig.
 */
import type { Store } from "../store.js";

const SMSAPI_URL = "https://api.smsapi.com/sms.do";

/** Normalize phone for SMSAPI: předvolba bez +, např. 420123456789 pro CZ. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("420") && digits.length === 12) return digits;
  if (digits.startsWith("420") && digits.length > 12) return digits.slice(0, 12);
  if (digits.length === 9) {
    if (digits.startsWith("0")) return "420" + digits.slice(1);
    return "420" + digits;
  }
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return "420" + digits;
}

/**
 * Odešle jednu SMS přes SMSAPI.com.
 * Používá store.settings.smsSmsapiConfig a env SMSAPI_TOKEN.
 */
export async function sendSms(store: Store, phone: string, text: string): Promise<void> {
  const config = store.settings.smsSmsapiConfig;
  if (!config?.enabled) {
    throw new Error("SMS brána není zapnutá. Zapněte ji v Admin → Nastavení → SMS (SMSAPI).");
  }
  const token = process.env.SMSAPI_TOKEN?.trim();
  if (!token) {
    throw new Error("Na serveru chybí proměnná SMSAPI_TOKEN. Vygenerujte OAuth token v SMSAPI portálu (OAuth Tokens) a nastavte ji v prostředí.");
  }
  const to = normalizePhone(phone);
  const from = (config.senderName ?? config.username ?? "Test").trim() || "Test";
  const params = new URLSearchParams({
    to,
    from,
    message: text.slice(0, 918),
    format: "json",
  });
  const res = await fetch(SMSAPI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`SMSAPI odeslání selhalo: ${res.status} ${body}`);
  }
  let data: { error?: number; message?: string; invalid_numbers?: unknown[] };
  try {
    data = JSON.parse(body) as { error?: number; message?: string; invalid_numbers?: unknown[] };
  } catch {
    throw new Error(`SMSAPI neplatná odpověď: ${body}`);
  }
  if (data.error != null) {
    const msg = data.message ?? `Chyba ${data.error}`;
    throw new Error(`SMSAPI: ${msg}`);
  }
}
