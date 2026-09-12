import { describe, expect, it } from "vitest";
import { bookingRequestConflicts, notificationPermission } from "./booking-requests";

describe("booking request domain rules", () => {
  it("blocks any start whose complete duration overlaps a pending hold", () => {
    const occupied = [{ startAt: new Date("2026-09-15T14:00:00Z"), durationMinutes: 90 }];

    expect(bookingRequestConflicts(new Date("2026-09-15T13:30:00Z"), 60, occupied)).toBe(true);
    expect(bookingRequestConflicts(new Date("2026-09-15T15:30:00Z"), 30, occupied)).toBe(false);
  });

  it("maps every notification kind to the permission that owns its action", () => {
    expect(notificationPermission("BOOKING_REQUEST")).toBe("appointments.manage");
    expect(notificationPermission("REVIEW_SUBMITTED")).toBe("reviews.manage");
    expect(notificationPermission("PAYMENT_ATTENTION")).toBe("payments.manage");
  });
});
