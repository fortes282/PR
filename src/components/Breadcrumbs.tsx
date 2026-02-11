"use client";

import Link from "next/link";

export type BreadcrumbItem =
  | { label: string; href: string }
  | { label: string; current: true };

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps): React.ReactElement {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-600">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isCurrent = "current" in item && item.current;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-gray-400" aria-hidden>
                  /
                </span>
              )}
              {isCurrent ? (
                <span className="font-medium text-gray-900" aria-current="page">
                  {item.label}
                </span>
              ) : "href" in item ? (
                <Link href={item.href} className="text-primary-600 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
