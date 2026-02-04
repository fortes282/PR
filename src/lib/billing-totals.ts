/**
 * Billing report totals: sum of service prices for unpaid appointments.
 * Single source of truth for period/filter-based unpaid total (tests + optional use in API).
 */

export type AppointmentLike = { paymentStatus: string; serviceId: string };
export type ServiceLike = { id: string; priceCzk: number };

/**
 * Total unpaid amount (CZK) from appointments in scope.
 * Only appointments with paymentStatus === "UNPAID" are summed; filter (e.g. by period) is applied.
 */
export function totalUnpaidFromAppointments(
  appointments: AppointmentLike[],
  services: ServiceLike[],
  filter: (a: AppointmentLike) => boolean
): number {
  const priceMap = new Map(services.map((s) => [s.id, s.priceCzk]));
  return appointments
    .filter((a) => a.paymentStatus === "UNPAID" && filter(a))
    .reduce((sum, a) => sum + (priceMap.get(a.serviceId) ?? 0), 0);
}
