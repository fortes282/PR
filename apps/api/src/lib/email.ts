/**
 * SMTP transport from env (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS).
 * Used for notification emails and test email. If SMTP_HOST is not set, returns null.
 */
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let cachedTransport: Transporter | null | undefined = undefined;

export function getSmtpTransport(): Transporter | null {
  if (cachedTransport !== undefined) return cachedTransport;
  const host = process.env.SMTP_HOST;
  if (!host) {
    cachedTransport = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER ?? undefined;
  const pass = process.env.SMTP_PASS ?? undefined;
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  return cachedTransport;
}

export function isSmtpConfigured(): boolean {
  return getSmtpTransport() !== null;
}

/** Verify SMTP connection (e.g. connect + auth). Returns { ok: true } or { ok: false, error: string }. */
export async function verifySmtpConnection(): Promise<{ ok: true } | { ok: false; error: string }> {
  const transport = getSmtpTransport();
  if (!transport) {
    return { ok: false, error: "SMTP není nakonfigurován. Nastavte na serveru: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS." };
  }
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
