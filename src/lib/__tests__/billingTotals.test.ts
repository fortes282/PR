/**
 * Unit tests: billing report totals from appointments.
 * Total unpaid = sum of service prices for unpaid appointments in period.
 */

type Appointment = { paymentStatus: string; serviceId: string };
type Service = { id: string; priceCzk: number };

function totalUnpaidFromAppointments(
  appointments: Appointment[],
  services: Service[],
  filter: (a: Appointment) => boolean
): number {
  const priceMap = new Map(services.map((s) => [s.id, s.priceCzk]));
  return appointments
    .filter((a) => a.paymentStatus === "UNPAID" && filter(a))
    .reduce((sum, a) => sum + (priceMap.get(a.serviceId) ?? 0), 0);
}

describe("billing report totals from appointments", () => {
  const services: Service[] = [
    { id: "s1", priceCzk: 800 },
    { id: "s2", priceCzk: 400 },
  ];

  it("sums unpaid appointments in period", () => {
    const appointments: Appointment[] = [
      { paymentStatus: "UNPAID", serviceId: "s1" },
      { paymentStatus: "UNPAID", serviceId: "s2" },
      { paymentStatus: "PAID", serviceId: "s1" },
    ];
    const total = totalUnpaidFromAppointments(appointments, services, () => true);
    expect(total).toBe(800 + 400);
  });

  it("ignores PAID appointments", () => {
    const appointments: Appointment[] = [
      { paymentStatus: "PAID", serviceId: "s1" },
    ];
    const total = totalUnpaidFromAppointments(appointments, services, () => true);
    expect(total).toBe(0);
  });

  it("respects filter (e.g. period)", () => {
    const appointments: Appointment[] = [
      { paymentStatus: "UNPAID", serviceId: "s1" },
      { paymentStatus: "UNPAID", serviceId: "s1" },
    ];
    let count = 0;
    const total = totalUnpaidFromAppointments(appointments, services, () => {
      count++;
      return count <= 1;
    });
    expect(total).toBe(800);
  });
});
