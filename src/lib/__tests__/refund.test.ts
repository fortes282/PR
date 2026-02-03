/**
 * Unit tests: cancellation refund decision.
 * Refund applies if paymentStatus === PAID and hours until start >= freeCancelHours.
 */

function canRefund(
  paymentStatus: string,
  startAt: string,
  freeCancelHours: number,
  now: Date
): boolean {
  if (paymentStatus !== "PAID") return false;
  const start = new Date(startAt);
  const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntil >= freeCancelHours;
}

describe("cancellation refund decision", () => {
  const freeCancelHours = 48;

  it("allows refund when PAID and more than freeCancelHours until start", () => {
    const now = new Date("2025-01-01T10:00:00Z");
    const startAt = "2025-01-03T12:00:00Z"; // 50h later
    expect(canRefund("PAID", startAt, freeCancelHours, now)).toBe(true);
  });

  it("denies refund when PAID but less than freeCancelHours until start", () => {
    const now = new Date("2025-01-01T10:00:00Z");
    const startAt = "2025-01-02T10:00:00Z"; // 24h later
    expect(canRefund("PAID", startAt, freeCancelHours, now)).toBe(false);
  });

  it("denies refund when UNPAID", () => {
    const now = new Date("2025-01-01T10:00:00Z");
    const startAt = "2025-01-03T12:00:00Z";
    expect(canRefund("UNPAID", startAt, freeCancelHours, now)).toBe(false);
  });

  it("allows refund exactly at freeCancelHours boundary", () => {
    const now = new Date("2025-01-01T10:00:00Z");
    const startAt = "2025-01-03T10:00:00Z"; // 48h
    expect(canRefund("PAID", startAt, freeCancelHours, now)).toBe(true);
  });
});
