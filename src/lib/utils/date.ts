/**
 * Date helpers for booking window, calendar, and display.
 */

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function subDays(d: Date, days: number): Date {
  return addDays(d, -days);
}

export function setHours(d: Date, h: number): Date {
  const out = new Date(d);
  out.setHours(h, 0, 0, 0);
  return out;
}

export function setMinutes(d: Date, m: number): Date {
  const out = new Date(d);
  out.setMinutes(m, 0, 0);
  return out;
}

export function format(date: Date, fmt: "date" | "datetime" | "time" = "date"): string {
  if (fmt === "date") return date.toISOString().slice(0, 10);
  if (fmt === "time") return date.toTimeString().slice(0, 5);
  return date.toISOString().slice(0, 16).replace("T", " ");
}

/** Returns YYYY-MM for the given date (for booking activation month key). */
export function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function startOfWeek(d: Date): Date {
  const out = startOfDay(d);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = start
  out.setDate(out.getDate() + diff);
  return out;
}

export function isWithinRange(date: Date, from: Date, to: Date): boolean {
  const t = date.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

export function subMonths(d: Date, months: number): Date {
  return addMonths(d, -months);
}

export function startOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setDate(1);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** 1 = Monday, 7 = Sunday (ISO-like). */
export function getDayOfWeek(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

export function parseTimeHHmm(s: string): { h: number; m: number } {
  const [h, m] = s.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}
