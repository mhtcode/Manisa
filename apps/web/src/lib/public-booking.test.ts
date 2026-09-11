import { describe, expect, it } from "vitest";
import { bookingWeekdays, buildPublicBookingSlots, parseClock } from "@/lib/public-booking";

describe("public booking availability", () => {
  it("builds future slots and excludes overlaps", () => {
    const slots = buildPublicBookingSlots({ date: "2026-09-14", timezone: "America/Toronto", openTime: "09:00", closeTime: "12:00", slotMinutes: 30, durationMinutes: 60, leadHours: 0, enabledWeekdays: [1] }, [{ startAt: new Date("2026-09-14T14:30:00Z"), durationMinutes: 30 }], new Date("2026-09-13T12:00:00Z"));
    expect(slots).toEqual(["09:00", "09:30", "11:00"]);
  });

  it("honors weekdays and validates clocks", () => {
    expect(bookingWeekdays("6,1,1,9,nope")).toEqual([1, 6]);
    expect(parseClock("18:30")).toBe(1110);
    expect(parseClock("25:00")).toBeNull();
    expect(buildPublicBookingSlots({ date: "2026-09-13", timezone: "America/Toronto", openTime: "09:00", closeTime: "18:00", slotMinutes: 30, durationMinutes: 30, leadHours: 0, enabledWeekdays: [1] }, [], new Date("2026-09-12T12:00:00Z"))).toEqual([]);
  });
});
