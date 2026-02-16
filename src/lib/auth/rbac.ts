/**
 * RBAC: can(role, action) mapping and route guard.
 * Backend: server must enforce RBAC authoritatively; this is for UI only.
 */

import type { Role } from "@/lib/contracts/auth";

export type Action =
  | "users:read" | "users:write"
  | "services:read" | "services:write"
  | "rooms:read" | "rooms:write"
  | "appointments:read" | "appointments:write" | "appointments:cancel" | "appointments:complete"
  | "credits:read" | "credits:adjust"
  | "billing:read" | "billing:markInvoiced"
  | "waitlist:read" | "waitlist:write" | "waitlist:notify"
  | "reports:read" | "reports:write" | "reports:visibility"
  | "notifications:read" | "notifications:send"
  | "settings:read" | "settings:write"
  | "stats:read"
  | "client:dashboard" | "client:book" | "client:credits" | "client:reports" | "client:waitlist";

const roleActions: Record<Role, Action[]> = {
  ADMIN: [
    "users:read", "users:write",
    "services:read", "services:write",
    "rooms:read", "rooms:write",
    "appointments:read", "appointments:write", "appointments:cancel", "appointments:complete",
    "credits:read", "credits:adjust",
    "billing:read", "billing:markInvoiced",
    "waitlist:read", "waitlist:write", "waitlist:notify",
    "reports:read", "reports:write", "reports:visibility",
    "notifications:read", "notifications:send",
    "settings:read", "settings:write",
    "stats:read",
  ],
  RECEPTION: [
    "users:read",
    "services:read", "rooms:read",
    "appointments:read", "appointments:write", "appointments:cancel", "appointments:complete",
    "credits:read", "credits:adjust",
    "billing:read", "billing:markInvoiced",
    "waitlist:read", "waitlist:write", "waitlist:notify",
    "reports:read", "reports:visibility",
    "notifications:read", "notifications:send",
    "settings:read",
    "stats:read",
  ],
  EMPLOYEE: [
    "appointments:read", "appointments:write", "appointments:complete",
    "reports:read", "reports:write", "reports:visibility",
    "notifications:read",
  ],
  CLIENT: [
    "client:dashboard", "client:book", "client:credits", "client:reports", "client:waitlist",
    "appointments:read", "appointments:cancel",
    "notifications:read",
  ],
};

export function can(role: Role, action: Action): boolean {
  const allowed = roleActions[role];
  if (!allowed) return false;
  return allowed.includes(action);
}

export function getDefaultRoute(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/users";
    case "RECEPTION":
      return "/reception/calendar";
    case "EMPLOYEE":
      return "/employee/calendar";
    case "CLIENT":
      return "/client/dashboard";
    default:
      return "/";
  }
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith("/admin/slot-offer-approvals")) return role === "ADMIN" || role === "RECEPTION";
    return role === "ADMIN";
  }
  if (pathname.startsWith("/reception")) return role === "RECEPTION" || role === "ADMIN";
  if (pathname.startsWith("/employee")) return role === "EMPLOYEE";
  if (pathname.startsWith("/client")) return role === "CLIENT";
  if (pathname.startsWith("/notifications")) return true;
  return false;
}
