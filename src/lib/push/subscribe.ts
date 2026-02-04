/**
 * Client-side Web Push subscription: request permission, register SW, subscribe with VAPID, send to backend.
 * Backend must send push via web-push (or similar) using the stored subscription and VAPID private key.
 */

import { api } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export type PushSubscribeResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Request notification permission, register service worker, subscribe to push with VAPID key, persist to backend.
 */
export async function subscribeToPush(): Promise<PushSubscribeResult> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { ok: false, error: "Prohlížeč nepodporuje notifikace." };
  }
  if (Notification.permission === "denied") {
    return { ok: false, error: "Oznámení jsou zablokována. Povolte je v nastavení prohlížeče." };
  }
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, error: "Oznámení nebyla povolena." };
  }

  const reg = await navigator.serviceWorker.getRegistration();
  const registration = reg ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  await navigator.serviceWorker.ready;

  const { vapidPublicKey } = await api.push.getConfig();
  if (!vapidPublicKey) {
    return { ok: false, error: "Push notifikace nejsou na serveru nakonfigurovány." };
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const keys = json.keys;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return { ok: false, error: "Nepodařilo se vytvořit odběr." };
  }

  await api.pushSubscriptions.subscribe({
    endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  });

  return { ok: true };
}

/**
 * Unsubscribe from push (remove from backend and optionally from pushManager).
 */
export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await api.pushSubscriptions.unsubscribe(sub.endpoint);
    await sub.unsubscribe();
  }
}
