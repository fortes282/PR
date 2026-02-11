/**
 * Send Web Push notifications using VAPID keys from env.
 * Requires: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (or from settings for public only).
 */
import webpush from "web-push";
import type { PushSubscription } from "@pristav/shared/notifications";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY?.trim();
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY?.trim();

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
}

/** Public key for client subscription: env VAPID_PUBLIC_KEY or from settings (admin UI). */
export function getVapidPublicKey(settingsVapid?: string | null): string | null {
  return VAPID_PUBLIC ?? settingsVapid?.trim() ?? null;
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
};

/**
 * Send a push notification to one subscription. Does not throw; returns { ok, error? }.
 */
export async function sendPush(
  subscription: Pick<PushSubscription, "endpoint" | "p256dh" | "auth">,
  payload: PushPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { ok: false, error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env." };
  }
  try {
    webpush.setVapidDetails("mailto:admin@pristav.cz", VAPID_PUBLIC, VAPID_PRIVATE);
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    };
    const payloadStr = JSON.stringify(payload);
    await webpush.sendNotification(pushSubscription, payloadStr);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
