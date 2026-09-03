import { describe, expect, it } from "vitest";
import { notificationAction } from "./action-notifications";

const now = new Date("2026-09-03T16:00:00.000Z");

describe("notificationAction", () => {
  it("offers direct finalization only after a confirmed visit has ended", () => {
    expect(notificationAction({ id: "visit_12345678", status: "CONFIRMED", paymentStatus: "UNPAID", startAt: new Date("2026-09-03T14:00:00.000Z"), expectedDurationMinutes: 60 }, now)?.actionLabel).toBe("Finalize");
    expect(notificationAction({ id: "visit_12345678", status: "CONFIRMED", paymentStatus: "UNPAID", startAt: new Date("2026-09-03T15:30:00.000Z"), expectedDurationMinutes: 60 }, now)).toBeNull();
  });

  it("asks for confirmation during the next 24 hours", () => {
    expect(notificationAction({ id: "visit_12345678", status: "SCHEDULED", paymentStatus: "UNPAID", startAt: new Date("2026-09-04T12:00:00.000Z"), expectedDurationMinutes: 60 }, now)?.kind).toBe("confirm");
  });

  it("flags unsettled finalized visits", () => {
    expect(notificationAction({ id: "visit_12345678", status: "COMPLETED", paymentStatus: "PARTIALLY_PAID", startAt: new Date("2026-09-02T12:00:00.000Z"), expectedDurationMinutes: 60 }, now)?.kind).toBe("payment");
  });
});
