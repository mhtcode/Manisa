import { describe, expect, it } from "vitest";
import { bookingRequestConflicts, canReviewBookingRequest, normalizeBookingEmail, normalizeBookingPhone, normalizeNotificationHref, notificationPermission } from "./booking-requests";

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

  it("normalizes contact identities before duplicate and customer matching", () => {
    expect(normalizeBookingPhone("+1 (416) 555-0101")).toBe("+14165550101");
    expect(normalizeBookingEmail(" Maryam@Example.COM ")).toBe("maryam@example.com");
  });

  it("allows only internal application links in notifications", () => {
    expect(normalizeNotificationHref("/appointments?stage=requests")).toBe("/appointments?stage=requests");
    expect(normalizeNotificationHref("https://example.com/steal")).toBe("/report");
    expect(normalizeNotificationHref("//example.com/steal")).toBe("/report");
  });

  it("allows approval or decline only while a request is pending", () => {
    expect(canReviewBookingRequest("PENDING")).toBe(true);
    expect(canReviewBookingRequest("APPROVED")).toBe(false);
    expect(canReviewBookingRequest("DECLINED")).toBe(false);
  });
});
