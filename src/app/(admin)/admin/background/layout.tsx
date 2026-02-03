"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/background", label: "Přehled vyhodnocení" },
  { href: "/admin/background/communication", label: "Komunikace" },
  { href: "/admin/background/recommendations", label: "Doporučení" },
];

export default function AdminBackgroundLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 pb-2">
        <h1 className="text-2xl font-bold text-gray-900">Pozadí algoritmů</h1>
        <nav className="flex gap-2" aria-label="Podstránky">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                pathname === t.href
                  ? "bg-primary-100 text-primary-800"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
