"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSession, getUser } from "@/lib/auth/session";
import { getDefaultRoute, canAccessRoute } from "@/lib/auth/rbac";
import { AppShell } from "@/components/layout/AppShell";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const user = getUser();
    if ((user as { mustChangePassword?: boolean })?.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    if (session.role !== "EMPLOYEE") {
      router.replace(getDefaultRoute(session.role));
      return;
    }
    if (!canAccessRoute(session.role, pathname)) {
      router.replace("/employee/calendar");
    }
  }, [router, pathname]);

  return <AppShell>{children}</AppShell>;
}
