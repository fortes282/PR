"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDefaultRoute, canAccessRoute } from "@/lib/auth/rbac";
import { AppShell } from "@/components/layout/AppShell";
import { PushPromptBanner } from "@/components/client/PushPromptBanner";

export default function ClientLayout({
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
    if (session.role !== "CLIENT") {
      router.replace(getDefaultRoute(session.role));
      return;
    }
    if (!canAccessRoute(session.role, pathname)) {
      router.replace("/client/dashboard");
    }
  }, [router, pathname]);

  return (
    <>
      <PushPromptBanner />
      <AppShell>{children}</AppShell>
    </>
  );
}
