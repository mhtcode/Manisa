import { describe, expect, it } from "vitest";
import { paymentStatusFor } from "./payments";

describe("paymentStatusFor", () => {
  it("derives unpaid, partial, and paid states", () => {
    expect(paymentStatusFor(100, 0)).toBe("UNPAID");
    expect(paymentStatusFor(100, 40)).toBe("PARTIALLY_PAID");
    expect(paymentStatusFor(100, 100)).toBe("PAID");
  });
});
