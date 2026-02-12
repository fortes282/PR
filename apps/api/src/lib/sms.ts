/**
 * FAYN MEX API: login then POST /sms/send with Bearer token.
 * See https://smsapi.fayn.cz/mex/api-docs/
 * Config from store.settings.smsFaynConfig; password from env FAYN_SMS_PASSWORD.
 */
import type { Store } from "../store.js";

/** Normalize phone to E.164 for FAYN: 00[1-9]... */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("420") && digits.length >= 12) return "00" + digits;
  if (digits.startsWith("420") && digits.length === 9) return "00420" + digits;
  if (digits.length >= 9 && digits.length <= 15) return "00" + digits;
  return "00" + digits;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getFaynToken(baseUrl: string, username: string, password: string): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;
  const url = `${baseUrl.replace(/\/$/, "")}/login`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FAYN login failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { token?: string; expiresIn?: number };
  const token = data.token;
  if (!token) throw new Error("FAYN login: no token in response");
  cachedToken = {
    token,
    expiresAt: Date.now() + (data.expiresIn ?? 86400) * 1000,
  };
  return token;
}

/**
 * Send one SMS via FAYN. Uses store.settings.smsFaynConfig and env FAYN_SMS_PASSWORD.
 * Returns true if sent, throws on config or API error.
 */
export async function sendSms(store: Store, phone: string, text: string): Promise<void> {
  const config = store.settings.smsFaynConfig;
  if (!config?.enabled || !config.username?.trim()) {
    throw new Error("SMS brána není zapnutá nebo chybí uživatelské jméno FAYN. Nastavte v Admin → Nastavení → SMS – FAYN brána.");
  }
  const password = process.env.FAYN_SMS_PASSWORD?.trim();
  if (!password) {
    throw new Error("Na serveru chybí proměnná FAYN_SMS_PASSWORD. Nastavte ji v prostředí (heslo k FAYN účtu).");
  }
  const baseUrl = config.baseUrl ?? "https://smsapi.fayn.cz/mex/";
  const token = await getFaynToken(baseUrl, config.username, password);
  const bNumber = normalizePhone(phone);
  const sendUrl = `${baseUrl.replace(/\/$/, "")}/sms/send`;
  const res = await fetch(sendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify([
      {
        bNumber,
        messageType: "SMS",
        text: text.slice(0, 1600),
      },
    ]),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FAYN send SMS failed: ${res.status} ${err}`);
  }
}
