"use client";

import { useEffect, useState } from "react";
import { getSession, getUser } from "./session";
import type { Session } from "@/lib/contracts/auth";
import type { User } from "@/lib/contracts/users";

/**
 * Returns session and user after mount. During SSR and first client paint returns null
 * so that server and client render the same HTML (avoids hydration mismatch).
 */
export function useSession(): { session: Session | null; user: User | null; mounted: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setUser(getUser());
    setMounted(true);
  }, []);

  return { session, user, mounted };
}
