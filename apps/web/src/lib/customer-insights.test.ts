import { describe, expect, it } from "vitest";
import { buildCustomerInsights, type CustomerVisitRecord } from "./customer-insights";

const visit = (overrides: Partial<CustomerVisitRecord>): CustomerVisitRecord => ({ actualDurationMinutes: 60, finalPrice: "100", paymentStatus: "PAID", serviceNames: ["Hair styling"], startAt: new Date("2026-08-01T14:00:00Z"), status: "COMPLETED", ...overrides });

describe("buildCustomerInsights", () => {
  it("derives recommendation-ready recency, preference, and value metrics", () => {
    const result = buildCustomerInsights([
      visit({ startAt: new Date("2026-07-01T14:00:00Z"), serviceNames: ["Hair styling", "Treatment"] }),
      visit({ startAt: new Date("2026-08-01T14:00:00Z"), finalPrice: "150", paymentStatus: "UNPAID" }),
      visit({ startAt: new Date("2026-06-01T14:00:00Z"), status: "HISTORICAL", finalPrice: null, actualDurationMinutes: null }),
      visit({ status: "NO_SHOW" }),
    ], new Date("2026-09-01T00:00:00Z"));
    expect(result.favoriteService).toEqual({ name: "Hair styling", count: 3 });
    expect(result.revenue).toBe(250);
    expect(result.unsettledValue).toBe(150);
    expect(result.attendanceRate).toBe(67);
    expect(result.historicalCount).toBe(1);
    expect(result.cadenceDays).toBe(31);
  });

  it("does not treat historical records as income", () => {
    const result = buildCustomerInsights([visit({ status: "HISTORICAL", finalPrice: "999" })]);
    expect(result.revenue).toBe(0);
    expect(result.completedCount).toBe(0);
  });
});
