"use client";

import { startOfWeek, addDays, setHours, setMinutes, format } from "@/lib/utils/date";

export type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  title?: string;
  clientName?: string;
  /** For color-coding by therapist; unassigned when undefined. */
  employeeId?: string;
};

/** 0% = red, 100% = saturated green. */
function occupancyColor(percent: number): string {
  const p = Math.max(0, Math.min(100, percent)) / 100;
  const r = Math.round(220 - 200 * p);
  const g = Math.round(50 + 110 * p);
  const b = Math.round(50 - 50 * p);
  return `rgb(${r},${g},${b})`;
}

const THERAPIST_COLORS = [
  "bg-blue-100 text-blue-900 border-blue-300",
  "bg-emerald-100 text-emerald-900 border-emerald-300",
  "bg-amber-100 text-amber-900 border-amber-300",
  "bg-violet-100 text-violet-900 border-violet-300",
  "bg-rose-100 text-rose-900 border-rose-300",
  "bg-cyan-100 text-cyan-900 border-cyan-300",
];

function slotColorClass(employeeId: string | undefined, indexByEmployeeId: Map<string, number>): string {
  if (!employeeId) return "bg-gray-100 text-gray-700 border-gray-300";
  let idx = indexByEmployeeId.get(employeeId);
  if (idx === undefined) {
    idx = indexByEmployeeId.size;
    indexByEmployeeId.set(employeeId, idx);
  }
  return THERAPIST_COLORS[idx % THERAPIST_COLORS.length];
}

type CalendarWeekViewProps = {
  weekStart: Date;
  slots: Slot[];
  onSlotClick?: (slot: Slot) => void;
  onEmptySlotClick?: (date: Date, hour: number) => void;
  /** When set, only show "+" for these slot starts (format "YYYY-MM-DDTHH"). Omit to show + on all empty cells. */
  availableSlotStarts?: Set<string>;
  /** Occupancy % per day (0–100), length 7. Shown above the grid; 0% red, 100% green. */
  dayOccupancyPercent?: number[];
};

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 8–17

function slotKey(day: Date, hour: number): string {
  return `${format(day, "date")}T${String(hour).padStart(2, "0")}`;
}

export function CalendarWeekView({
  weekStart,
  slots,
  onSlotClick,
  onEmptySlotClick,
  availableSlotStarts,
  dayOccupancyPercent,
}: CalendarWeekViewProps): React.ReactElement {
  const start = startOfWeek(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const employeeColorIndex = new Map<string, number>();

  function isSlotAvailable(day: Date, hour: number): boolean {
    if (!availableSlotStarts) return true;
    return availableSlotStarts.has(slotKey(day, hour));
  }

  function getSlotsForDayAndHour(day: Date, hour: number): Slot[] {
    const dayStr = format(day, "date");
    const hourStart = setMinutes(setHours(day, hour), 0);
    const hourEnd = setMinutes(setHours(day, hour + 1), 0);
    return slots.filter((s) => {
      const start = new Date(s.startAt);
      const dayMatch = format(start, "date") === dayStr;
      const hourMatch = start.getHours() === hour;
      return dayMatch && hourMatch;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      {dayOccupancyPercent && dayOccupancyPercent.length >= 7 && (
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs">
          <div className="w-12 flex-shrink-0 border-r border-gray-200 px-2 py-2 font-medium text-gray-600">
            Využití
          </div>
          {days.map((d, i) => (
            <div
              key={d.toISOString()}
              className="flex min-w-[120px] flex-1 flex-col items-center justify-center border-r border-gray-200 py-2 transition-colors duration-normal last:border-r-0"
              style={{ backgroundColor: occupancyColor(dayOccupancyPercent[i] ?? 0) }}
              title={`${format(d, "date")}: ${Math.round(dayOccupancyPercent[i] ?? 0)} %`}
            >
              <span className="font-medium text-gray-800">
                {Math.round(dayOccupancyPercent[i] ?? 0)} %
              </span>
            </div>
          ))}
        </div>
      )}
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="w-12 border-r border-gray-200 px-2 py-2 text-left font-medium text-gray-700">
              Čas
            </th>
            {days.map((d) => (
              <th
                key={d.toISOString()}
                className="min-w-[120px] border-r border-gray-200 px-2 py-2 text-center font-medium text-gray-700 last:border-r-0"
              >
                {format(d, "date")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour} className="border-b border-gray-100">
              <td className="border-r border-gray-200 px-2 py-1 text-gray-500">
                {hour}:00
              </td>
              {days.map((day) => {
                const daySlots = getSlotsForDayAndHour(day, hour);
                return (
                  <td
                    key={`${format(day, "date")}-${hour}`}
                    className="min-w-[120px] border-r border-gray-100 align-top last:border-r-0"
                  >
                    <div className="min-h-[40px] space-y-1 p-1">
                      {daySlots.length > 0 ? (
                        daySlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            className={`min-h-[36px] w-full rounded border px-2 py-1 text-left text-xs transition-colors duration-fast hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 active:scale-[0.98] ${slotColorClass(slot.employeeId, employeeColorIndex)}`}
                            onClick={() => onSlotClick?.(slot)}
                          >
                            {slot.clientName ?? slot.title ?? (slot.employeeId ? "Termín" : "Volný")}
                          </button>
                        ))
                      ) : isSlotAvailable(day, hour) && onEmptySlotClick ? (
                        <button
                          type="button"
                          className="min-h-[36px] w-full rounded border border-dashed border-gray-200 py-1 text-xs text-gray-400 transition-colors duration-fast hover:border-primary-300 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 active:scale-[0.98]"
                          onClick={() =>
                            onEmptySlotClick(setMinutes(setHours(day, hour), 0), hour)
                          }
                        >
                          +
                        </button>
                      ) : (
                        <div className="min-h-[28px]" />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
