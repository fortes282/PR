/**
 * Frontend-only session store (mock). Session includes userId, role, accessToken placeholder.
 * Backend: replace with JWT access/refresh; store accessToken in httpOnly cookie or memory;
 * refresh token in httpOnly cookie. On 401, attempt token refresh then redirect to login.
 */

import type { Session } from "@/lib/contracts/auth";
import type { User } from "@/lib/contracts/users";

const SESSION_KEY = "pristav_session";
const USER_KEY = "pristav_user";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setSession(session: Session, user: User): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export function getAccessToken(): string | null {
  const s = getSession();
  return s?.accessToken ?? null;
}
