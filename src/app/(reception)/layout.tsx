"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDefaultRoute, canAccessRoute } from "@/lib/auth/rbac";
import { AppShell } from "@/components/layout/AppShell";

export default function ReceptionLayout({
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
    if (session.role !== "RECEPTION") {
      router.replace(getDefaultRoute(session.role));
      return;
    }
    if (!canAccessRoute(session.role, pathname)) {
      router.replace("/reception/calendar");
    }
  }, [router, pathname]);

  return <AppShell>{children}</AppShell>;
}
