"use client";

import { startOfWeek, startOfMonth, addMonths, subMonths } from "@/lib/utils/date";

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

type CalendarMonthNavProps = {
  /** Week start date (Monday) currently displayed */
  weekStart: Date;
  onWeekChange: (weekStart: Date) => void;
  /** Disable going before this month (e.g. current month) */
  minMonth?: Date;
  /** Disable going after this month (e.g. booking window) */
  maxMonth?: Date;
};

export function CalendarMonthNav({
  weekStart,
  onWeekChange,
  minMonth,
  maxMonth,
}: CalendarMonthNavProps): React.ReactElement {
  const monthStart = startOfMonth(weekStart);
  const canPrev = !minMonth || monthStart > startOfMonth(minMonth);
  const canNext = !maxMonth || addMonths(monthStart, 1) <= startOfMonth(maxMonth);

  const goPrev = (): void => {
    const prevWeekStart = startOfWeek(subMonths(weekStart, 1));
    onWeekChange(prevWeekStart);
  };

  const goNext = (): void => {
    const nextWeekStart = startOfWeek(addMonths(weekStart, 1));
    onWeekChange(nextWeekStart);
  };

  const goToday = (): void => {
    onWeekChange(startOfWeek(new Date()));
  };

  const label = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <h2 className="text-lg font-semibold text-gray-800 min-w-[180px]">{label}</h2>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={goPrev}
          disabled={!canPrev}
          aria-label="Předchozí měsíc"
        >
          ←
        </button>
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          onClick={goToday}
          aria-label="Aktuální týden"
        >
          Dnes
        </button>
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={goNext}
          disabled={!canNext}
          aria-label="Další měsíc"
        >
          →
        </button>
      </div>
    </div>
  );
}
