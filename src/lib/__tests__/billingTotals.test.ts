/**
 * Unit tests: billing report totals from appointments.
 * Total unpaid = sum of service prices for unpaid appointments in period.
 */
import {
  totalUnpaidFromAppointments,
  type AppointmentLike,
  type ServiceLike,
} from "@/lib/billing-totals";

describe("billing report totals from appointments", () => {
  const services: ServiceLike[] = [
    { id: "s1", priceCzk: 800 },
    { id: "s2", priceCzk: 400 },
  ];

  it("sums unpaid appointments in period", () => {
    const appointments: AppointmentLike[] = [
      { paymentStatus: "UNPAID", serviceId: "s1" },
      { paymentStatus: "UNPAID", serviceId: "s2" },
      { paymentStatus: "PAID", serviceId: "s1" },
    ];
    const total = totalUnpaidFromAppointments(appointments, services, () => true);
    expect(total).toBe(800 + 400);
  });

  it("ignores PAID appointments", () => {
    const appointments: AppointmentLike[] = [
      { paymentStatus: "PAID", serviceId: "s1" },
    ];
    const total = totalUnpaidFromAppointments(appointments, services, () => true);
    expect(total).toBe(0);
  });

  it("respects filter (e.g. period)", () => {
    const appointments: AppointmentLike[] = [
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
