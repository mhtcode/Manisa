import { describe, expect, it } from "vitest";
import { calculateCoreReportMetrics, reportPercentChange } from "./report-metrics";

describe("report metrics", () => {
  it("uses finalized actuals and excludes historical estimates", () => {
    const metrics = calculateCoreReportMetrics([
      { status: "COMPLETED", finalPrice: "150.00", actualDurationMinutes: 90, paymentStatus: "PAID" },
      { status: "COMPLETED", finalPrice: "50.00", actualDurationMinutes: 30, paymentStatus: "UNPAID" },
      { status: "HISTORICAL", finalPrice: null, actualDurationMinutes: null, paymentStatus: "UNPAID" },
      { status: "CANCELLED", finalPrice: null, actualDurationMinutes: null, paymentStatus: "UNPAID" },
      { status: "NO_SHOW", finalPrice: null, actualDurationMinutes: null, paymentStatus: "UNPAID" },
    ]);
    expect(metrics).toMatchObject({ revenue: 200, visits: 2, hours: 2, hourlyIncome: 100, averageTicket: 100, outstanding: 50, cancellations: 1, noShows: 1 });
  });

  it("handles empty and zero previous periods without NaN", () => {
    expect(reportPercentChange(0, 0)).toBe(0);
    expect(reportPercentChange(25, 0)).toBe(100);
    expect(reportPercentChange(75, 100)).toBe(-25);
  });
});
