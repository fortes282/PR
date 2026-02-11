"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export type EmptyStateAction =
  | { type: "link"; label: string; href: string }
  | { type: "button"; label: string; onClick: () => void };

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /** "card" = larger block with padding, "inline" = compact text + icon */
  variant?: "card" | "inline";
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "card",
}: EmptyStateProps): React.ReactElement {
  if (variant === "inline") {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-gray-500 sm:flex-row sm:justify-center sm:gap-3">
        <Icon className="h-8 w-8 shrink-0 text-gray-400" aria-hidden />
        <div>
          <p className="font-medium text-gray-700">{title}</p>
          {description && <p className="mt-0.5 text-sm">{description}</p>}
          {action && (
            <div className="mt-2">
              {action.type === "link" ? (
                <Link
                  href={action.href}
                  className="text-primary-600 hover:underline font-medium"
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={action.onClick}
                  className="text-primary-600 hover:underline font-medium"
                >
                  {action.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-gray-50/50 px-6 py-12 text-center"
      role="status"
      aria-label={title}
    >
      <Icon className="mb-4 h-12 w-12 shrink-0 text-gray-400" aria-hidden />
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-gray-600">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.type === "link" ? (
            <Link
              href={action.href}
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
