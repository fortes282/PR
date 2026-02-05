"use client";

import { useEffect, useState } from "react";
import { format, startOfDay, setHours, setMinutes } from "@/lib/utils/date";

export type TimelineSlot = {
  id: string;
  startAt: string;
  endAt: string;
  clientName?: string;
  title?: string;
  clientId?: string;
};

const HOUR_START = 7;
const HOUR_END = 20;
const TOTAL_MINUTES = (HOUR_END - HOUR_START) * 60;
const PX_PER_HOUR = 60;
const PX_PER_MINUTE = PX_PER_HOUR / 60;

type DayTimelineViewProps = {
  /** The single day to display */
  date: Date;
  slots: TimelineSlot[];
  onSlotClick?: (slot: TimelineSlot) => void;
  /** When true, show a live "current time" line that updates every minute */
  showNowLine?: boolean;
};

function dayStart(d: Date): Date {
  return setMinutes(setHours(startOfDay(d), HOUR_START), 0);
}

function dayEnd(d: Date): Date {
  return setMinutes(setHours(startOfDay(d), HOUR_END), 0);
}

/** Minutes from HOUR_START (0 = 7:00). */
function minutesFromStart(iso: string, day: Date): number {
  const d = new Date(iso);
  const dayStr = format(day, "date");
  const slotStr = format(d, "date");
  if (slotStr !== dayStr) return 0;
  return d.getHours() * 60 + d.getMinutes() - HOUR_START * 60;
}

function slotDurationMinutes(startAt: string, endAt: string): number {
  const s = new Date(startAt).getTime();
  const e = new Date(endAt).getTime();
  return Math.max(1, (e - s) / (60 * 1000));
}

export function DayTimelineView({
  date,
  slots,
  onSlotClick,
  showNowLine = false,
}: DayTimelineViewProps): React.ReactElement {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!showNowLine) return;
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, [showNowLine]);

  const start = dayStart(date);
  const end = dayEnd(date);
  const isToday =
    format(date, "date") === format(now, "date");
  const showLine = showNowLine && isToday && now >= start && now <= end;
  const nowMinutes = showLine
    ? now.getHours() * 60 + now.getMinutes() - HOUR_START * 60
    : 0;
  const nowPercent = (nowMinutes / TOTAL_MINUTES) * 100;

  const hours = Array.from(
    { length: HOUR_END - HOUR_START },
    (_, i) => i + HOUR_START
  );

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex">
        {/* Time labels */}
        <div className="w-14 flex-shrink-0 border-r border-gray-200 bg-gray-50/80 py-2">
          {hours.map((h) => (
            <div
              key={h}
              className="flex h-12 items-start justify-end pr-2 text-xs text-gray-500"
              style={{ minHeight: 60 }}
            >
              {h}:00
            </div>
          ))}
        </div>

        {/* Day column */}
        <div
          className="relative flex-1"
          style={{ minHeight: TOTAL_MINUTES * PX_PER_MINUTE }}
        >
          {/* Hour grid lines */}
          {hours.map((h) => (
            <div
              key={h}
              className="border-t border-gray-100"
              style={{ minHeight: PX_PER_HOUR }}
              aria-hidden
            />
          ))}

          {/* Appointment blocks */}
          {slots
            .filter((s) => {
              const slotDay = format(new Date(s.startAt), "date");
              const viewDay = format(date, "date");
              return slotDay === viewDay;
            })
            .map((slot) => {
              const topMin = minutesFromStart(slot.startAt, date);
              const durationMin = slotDurationMinutes(slot.startAt, slot.endAt);
              const topPx = topMin * PX_PER_MINUTE;
              const heightPx = Math.max(28, durationMin * PX_PER_MINUTE);
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => onSlotClick?.(slot)}
                  className="absolute left-2 right-2 rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-left text-sm shadow-sm transition hover:border-primary-400 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                  style={{
                    top: topPx,
                    height: heightPx,
                    minHeight: 24,
                  }}
                >
                  <span className="font-medium text-primary-900">
                    {slot.clientName ?? slot.title ?? "Termín"}
                  </span>
                  <span className="ml-2 text-xs text-primary-700">
                    {format(new Date(slot.startAt), "time")} –{" "}
                    {format(new Date(slot.endAt), "time")}
                  </span>
                </button>
              );
            })}

          {/* Current time line (today only) */}
          {showLine && (
            <div
              className="absolute left-0 right-0 z-10 flex items-center"
              style={{ top: `${nowPercent}%` }}
              role="presentation"
              aria-hidden
            >
              <span className="mr-2 rounded bg-primary-600 px-1.5 py-0.5 text-xs font-medium text-white shadow">
                Teď
              </span>
              <span className="h-0.5 flex-1 bg-primary-600 shadow-sm" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
