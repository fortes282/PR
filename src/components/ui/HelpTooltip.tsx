"use client";

import { useId, useState } from "react";

type HelpTooltipProps = {
  /** Short title (e.g. name of the function). */
  title: string;
  /** What the function does. */
  description: string;
  /** If set, explains why the function is currently unavailable. */
  disabledReason?: string;
  /** Optional class for the trigger icon wrapper. */
  className?: string;
};

/**
 * Informational tooltip for functions: what they do and, if unavailable, why.
 * Use next to buttons or labels. Accessible: focusable trigger, visible on focus and hover.
 */
export function HelpTooltip({
  title,
  description,
  disabledReason,
  className = "",
}: HelpTooltipProps): React.ReactElement {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label="Nápověda"
        aria-describedby={visible ? id : undefined}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        <span aria-hidden>ⓘ</span>
      </button>
      {visible && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-full top-0 z-50 ml-1 w-64 rounded border border-gray-200 bg-white p-2 text-left text-sm shadow-lg"
        >
          <span className="font-medium text-gray-900">{title}</span>
          <p className="mt-1 text-gray-600">{description}</p>
          {disabledReason && (
            <p className="mt-1 text-amber-700">
              <strong>Proč není k dispozici:</strong> {disabledReason}
            </p>
          )}
        </span>
      )}
    </span>
  );
}
