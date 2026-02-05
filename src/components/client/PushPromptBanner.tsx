"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth/useSession";

/**
 * Shown to clients when admin has left "prompt to enable push" on and the client
 * has not yet subscribed. Displayed on first and every subsequent app open until
 * they enable push or admin turns off the prompt.
 */
export function PushPromptBanner(): React.ReactElement | null {
  const { session, mounted } = useSession();
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!mounted || session?.role !== "CLIENT") {
      setChecked(true);
      return;
    }
    let cancelled = false;
    Promise.all([
      api.settings.get(),
      typeof navigator !== "undefined" && navigator.serviceWorker
        ? navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription())
        : Promise.resolve(null),
    ])
      .then(([settings, subscription]) => {
        if (cancelled) return;
        const promptEnabled = settings.pushNotificationConfig?.promptClientToEnablePush !== false;
        const notSubscribed = !subscription;
        setShow(Boolean(promptEnabled && notSubscribed));
      })
      .catch(() => {
        if (!cancelled) setShow(false);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, session?.role]);

  if (!checked || !show) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900"
      role="region"
      aria-label="Výzva k zapnutí push notifikací"
    >
      <span className="flex items-center gap-2">
        <Bell className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
        <span>
          Pro připomínky termínů a novinky povolte prosím push notifikace v nastavení.
        </span>
      </span>
      <Link
        href="/client/settings"
        className="shrink-0 rounded bg-primary-600 px-3 py-1.5 font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
      >
        Povolit push
      </Link>
    </div>
  );
}
