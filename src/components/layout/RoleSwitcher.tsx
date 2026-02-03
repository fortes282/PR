"use client";

/**
 * Dev-only role switcher (mock mode). Sets role in localStorage and reloads.
 * Backend: remove or hide in production; real auth uses login form.
 */

import { useRouter } from "next/navigation";
import type { Role } from "@/lib/contracts/auth";
import { api } from "@/lib/api";

const ROLES: Role[] = ["ADMIN", "RECEPTION", "EMPLOYEE", "CLIENT"];

export function RoleSwitcher(): React.ReactElement | null {
  const router = useRouter();
  const isMock = process.env.NEXT_PUBLIC_API_MODE !== "http";

  if (!isMock) return null;

  const handleSwitch = async (role: Role): Promise<void> => {
    await api.auth.logout();
    await api.auth.login({ role });
    router.push(role === "CLIENT" ? "/client/dashboard" : role === "ADMIN" ? "/admin/users" : role === "RECEPTION" ? "/reception/calendar" : "/employee/calendar");
    router.refresh();
  };

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm">
      <span className="font-medium text-gray-700">Dev: přepnout roli</span>
      <div className="mt-1 flex flex-wrap gap-1">
        {ROLES.map((role) => (
          <button
            key={role}
            type="button"
            className="btn-secondary rounded px-2 py-1 text-xs"
            onClick={() => handleSwitch(role)}
          >
            {role}
          </button>
        ))}
      </div>
    </div>
  );
}
