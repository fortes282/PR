/**
 * Cancellation and refund rules.
 * Single source of truth for UI and API (mock/backend).
 * Refund applies when paymentStatus === PAID and hours until start >= freeCancelHours.
 */

/**
 * Whether a paid appointment is eligible for refund if cancelled now.
 * @param paymentStatus - e.g. "PAID" | "UNPAID"
 * @param startAt - ISO datetime of appointment start
 * @param freeCancelHours - setting (e.g. 48)
 * @param now - reference time (default: current time)
 */
export function canRefund(
  paymentStatus: string,
  startAt: string,
  freeCancelHours: number,
  now: Date = new Date()
): boolean {
  if (paymentStatus !== "PAID") return false;
  const start = new Date(startAt);
  const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntil >= freeCancelHours;
}
