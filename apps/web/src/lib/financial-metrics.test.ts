import { describe, expect, it } from "vitest";
import { calculateFinancialMetrics } from "./financial-metrics";

describe("financial metrics", () => {
  it("separates revenue, cash collection, and known outstanding", () => {
    const visits = [
      { finalPrice: "100.00", paymentStatus: "PAID" as const, paymentReconciliationRequired: false, payments: [{ amount: "100.00" }] },
      { finalPrice: "80.00", paymentStatus: "PARTIALLY_PAID" as const, paymentReconciliationRequired: false, payments: [{ amount: "30.00" }] },
      { finalPrice: "60.00", paymentStatus: "PARTIALLY_PAID" as const, paymentReconciliationRequired: true, payments: [] },
    ];
    const metrics = calculateFinancialMetrics(visits, [{ appointmentId: "a", amount: "100.00" }, { appointmentId: "b", amount: "20.00" }, { appointmentId: "b", amount: "10.00" }]);
    expect(metrics).toMatchObject({ finalRevenue: 240, collected: 130, outstanding: 50, averageCollection: 65, paidVisits: 1, partialVisits: 2, unreconciledVisits: 1 });
  });

  it("never reports a negative outstanding balance", () => {
    const metrics = calculateFinancialMetrics([{ finalPrice: 50, paymentStatus: "PAID", paymentReconciliationRequired: false, payments: [{ amount: 60 }] }], []);
    expect(metrics.outstanding).toBe(0);
    expect(metrics.averageCollection).toBe(0);
  });
});
