import { describe, expect, it } from "vitest";
import { billPaymentStatus, calculateCashbook } from "./cashbook";

describe("cashbook calculations", () => {
  it("keeps transfers out of consolidated cash flow", () => {
    const result = calculateCashbook([{ id: "cash", openingBalance: 100 }, { id: "bank", openingBalance: 50 }], [], [
      { type: "APPOINTMENT_PAYMENT", amount: 80, accountId: "cash" },
      { type: "EXPENSE", amount: 20, accountId: "cash" },
      { type: "TRANSFER", amount: 50, accountId: "cash", destinationAccountId: "bank" },
    ]);
    expect(result).toMatchObject({ opening: 150, cashIn: 80, cashOut: 20, netCashFlow: 60, closing: 210 });
    expect(result.balances.get("cash")).toBe(110);
    expect(result.balances.get("bank")).toBe(100);
  });

  it("derives bill state from paid amount and due date", () => {
    expect(billPaymentStatus(100, 100)).toBe("PAID");
    expect(billPaymentStatus(100, 20)).toBe("PARTIAL");
    expect(billPaymentStatus(100, 0, new Date("2020-01-01"), new Date("2021-01-01"))).toBe("OVERDUE");
  });
});
