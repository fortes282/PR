"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarCheck,
  Wallet,
  FileText,
  Settings,
  List,
  Calendar,
  Clock,
  Users,
  Receipt,
  DoorOpen,
  Briefcase,
  BarChart3,
  Bell,
  LogOut,
  Cpu,
  Anchor,
} from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";
import { useSession } from "@/lib/auth/useSession";
import { getDefaultRoute } from "@/lib/auth/rbac";
import { formatCzk } from "@/lib/utils/money";
import type { Role } from "@/lib/contracts/auth";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string; size?: number | string }> };

const clientNav: NavItem[] = [
  { href: "/client/dashboard", label: "Přehled", icon: LayoutDashboard },
  { href: "/client/book", label: "Rezervace", icon: CalendarPlus },
  { href: "/client/appointments", label: "Moje rezervace", icon: CalendarCheck },
  { href: "/client/credits", label: "Kredity", icon: Wallet },
  { href: "/client/reports", label: "Zprávy", icon: FileText },
  { href: "/client/settings", label: "Nastavení", icon: Settings },
  { href: "/client/waitlist", label: "Čekací list", icon: List },
];

const receptionNav: NavItem[] = [
  { href: "/reception/calendar", label: "Kalendář", icon: Calendar },
  { href: "/reception/working-hours", label: "Pracovní doba", icon: Clock },
  { href: "/reception/booking-activation", label: "Aktivace rezervací", icon: CalendarCheck },
  { href: "/reception/appointments", label: "Rezervace", icon: Calendar },
  { href: "/reception/clients", label: "Klienti", icon: Users },
  { href: "/reception/waitlist", label: "Čekací list", icon: List },
  { href: "/reception/billing", label: "Fakturace", icon: Receipt },
];

const employeeNav: NavItem[] = [
  { href: "/employee/calendar", label: "Rezervace (kalendář)", icon: Calendar },
  { href: "/employee/medical-reports/new", label: "Lékařská zpráva", icon: FileText },
  { href: "/employee/colleagues", label: "Kolegové", icon: Users },
  { href: "/employee/appointments", label: "Seznam rezervací", icon: CalendarCheck },
];

const adminNav: NavItem[] = [
  { href: "/admin/users", label: "Uživatelé", icon: Users },
  { href: "/admin/clients", label: "Klienti", icon: Users },
  { href: "/admin/services", label: "Služby", icon: Briefcase },
  { href: "/admin/rooms", label: "Místnosti", icon: DoorOpen },
  { href: "/admin/billing", label: "Fakturace", icon: Receipt },
  { href: "/admin/background", label: "Pozadí algoritmů", icon: Cpu },
  { href: "/admin/settings", label: "Nastavení", icon: Settings },
  { href: "/admin/stats", label: "Statistiky", icon: BarChart3 },
];

const clientBottomNav: NavItem[] = [
  { href: "/client/dashboard", label: "Přehled", icon: LayoutDashboard },
  { href: "/client/book", label: "Rezervace", icon: CalendarPlus },
  { href: "/client/credits", label: "Kredity", icon: Wallet },
  { href: "/client/reports", label: "Zprávy", icon: FileText },
];

function navForRole(role: Role): NavItem[] {
  switch (role) {
    case "CLIENT":
      return clientNav;
    case "RECEPTION":
      return receptionNav;
    case "EMPLOYEE":
      return employeeNav;
    case "ADMIN":
      return adminNav;
    default:
      return [];
  }
}

function isClientPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const { session, user, mounted } = useSession();
  const [clientCredits, setClientCredits] = useState<number | null>(null);

  useEffect(() => {
    if (session?.role === "CLIENT" && session?.userId) {
      import("@/lib/api").then(({ api }) =>
        api.credits.get(session.userId).then((acc) => setClientCredits(acc.balanceCzk))
      );
    }
  }, [session?.role, session?.userId]);

  if (!mounted || !session || !user) {
    return (
      <main className="min-h-screen bg-slate-50 p-4">
        <p className="text-gray-600">Nejste přihlášeni.</p>
        <Link href="/login" className="btn-primary mt-2 inline-block">
          Přihlásit se
        </Link>
        {children}
      </main>
    );
  }

  const nav = navForRole(session.role);
  const isClient = session.role === "CLIENT";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      {/* Sidebar: hidden on mobile for client, visible on desktop */}
      <aside
        className={
          isClient
            ? "hidden w-full border-b border-gray-200 bg-white md:flex md:w-56 md:flex-col md:border-b-0 md:border-r"
            : "w-full border-b border-gray-200 bg-white md:w-56 md:border-b-0 md:border-r"
        }
      >
        <div className="flex items-center justify-between gap-3 p-4">
          <Link
            href={getDefaultRoute(session.role)}
            className="group flex items-center gap-2"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-sky-600 text-white shadow-sm transition-transform duration-fast group-hover:-translate-y-0.5">
              <Anchor className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-semibold text-sky-800 transition-colors duration-fast group-hover:text-sky-900">
              Přístav Radosti
            </span>
          </Link>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-700">{user.name}</p>
            <p className="text-[11px] text-gray-500">{session.role}</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1 p-2 md:flex-col">
          {nav.map((item) => {
            const active = isClientPath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item-active-indicator relative flex min-h-[44px] min-w-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  active
                    ? "nav-item-active-indicator-active bg-sky-100 font-medium text-sky-800"
                    : "text-gray-700 hover:bg-gray-100"
                } border-l-2 ${active ? "border-primary-500" : "border-transparent"}`}
              >
                <Icon className="h-5 w-5 shrink-0" size={20} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/notifications"
            className={`nav-item-active-indicator relative flex min-h-[44px] min-w-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              pathname === "/notifications"
                ? "nav-item-active-indicator-active bg-sky-100 font-medium text-sky-800 border-l-2 border-primary-500"
                : "text-gray-700 hover:bg-gray-100 border-l-2 border-transparent"
            }`}
          >
            <Bell className="h-5 w-5 shrink-0" size={20} aria-hidden />
            <span>Oznámení</span>
          </Link>
        </nav>
        <div className="border-t border-gray-200 p-2">
          <RoleSwitcher />
        </div>
      </aside>

      <div className="flex flex-1 flex-col pb-20 md:pb-0">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-800">
              {user.name}
              {isClient && session.role === "CLIENT" && " · Klient"}
            </span>
            <div className="flex items-center gap-3">
              {isClient && clientCredits != null && (
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-medium text-gray-700">
                  {formatCzk(clientCredits)}
                </span>
              )}
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 transition-colors duration-fast hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                onClick={async () => {
                  const { api } = await import("@/lib/api");
                  await api.auth.logout();
                  window.location.href = "/login";
                }}
              >
                <LogOut className="h-4 w-4" size={16} aria-hidden />
                Odhlásit
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4">{children}</main>
      </div>

      {/* Bottom nav: client only, mobile only */}
      {isClient && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-gray-200 bg-white shadow-lg md:hidden"
          aria-label="Hlavní navigace"
        >
          {clientBottomNav.map((item) => {
            const active = isClientPath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-3 text-xs transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset ${
                  active
                    ? "bg-sky-50 font-medium text-sky-700 scale-105"
                    : "text-gray-600 hover:bg-gray-50 hover:-translate-y-0.5 active:translate-y-0"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" size={20} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
