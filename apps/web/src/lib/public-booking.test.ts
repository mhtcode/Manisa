import { describe, expect, it } from "vitest";
import { bookingWeekdays, buildPublicBookingSlots, normalizeBookingWindows, parseClock } from "./public-booking";

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

  it("offers only explicitly published start times", () => {
    const slots = buildPublicBookingSlots({ date: "2026-09-15", timezone: "America/Toronto", openTime: "08:00", closeTime: "21:00", slotMinutes: 30, durationMinutes: 90, leadHours: 0, enabledWeekdays: [2], explicitStartTimes: ["09:00", "11:30", "15:00"] }, [{ startAt: new Date("2026-09-15T16:00:00Z"), durationMinutes: 60 }], new Date("2026-09-14T12:00:00Z"));
    expect(slots).toEqual(["09:00", "15:00"]);
  });

  it("normalizes persisted weekly availability", () => {
    expect(normalizeBookingWindows({ "2": ["15:00", "09:00", "15:00", "bad"], "9": ["10:00"] })).toEqual({ "2": ["09:00", "15:00"] });
    expect(normalizeBookingWindows(null)).toEqual({});
  });
});
