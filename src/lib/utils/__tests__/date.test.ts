/**
 * Unit tests: date helpers used for booking window and calendar.
 */
import {
  addDays,
  subDays,
  addMonths,
  monthKey,
  startOfMonth,
  isWithinRange,
  startOfWeek,
} from "@/lib/utils/date";

describe("date helpers (booking window / calendar)", () => {
  it("addDays and subDays shift date correctly", () => {
    const d = new Date("2025-01-15T12:00:00Z");
    expect(addDays(d, 2).toISOString().slice(0, 10)).toBe("2025-01-17");
    expect(subDays(d, 3).toISOString().slice(0, 10)).toBe("2025-01-12");
  });

  it("monthKey returns YYYY-MM for activation month key", () => {
    expect(monthKey(new Date("2025-02-03"))).toBe("2025-02");
    expect(monthKey(new Date("2024-12-31"))).toBe("2024-12");
  });

  it("addMonths shifts month correctly", () => {
    const d = new Date(2025, 0, 15); // Jan 15, 2025
    const next = addMonths(d, 1);
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(15);
  });

  it("isWithinRange is inclusive", () => {
    const from = new Date("2025-01-01");
    const to = new Date("2025-01-31");
    expect(isWithinRange(new Date("2025-01-15"), from, to)).toBe(true);
    expect(isWithinRange(new Date("2025-01-01"), from, to)).toBe(true);
    expect(isWithinRange(new Date("2025-01-31"), from, to)).toBe(true);
    expect(isWithinRange(new Date("2025-02-01"), from, to)).toBe(false);
  });

  it("startOfWeek returns Monday", () => {
    // Feb 3, 2025 is Monday
    const monday = new Date(2025, 1, 3);
    const weekStart = startOfWeek(monday);
    expect(weekStart.getDay()).toBe(1); // Monday = 1 in getDay()
    expect(weekStart.getDate()).toBe(3);
  });
});
