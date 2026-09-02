import { describe, expect, it } from "vitest";
import { appointmentsOverlap, canFinalizeAppointment } from "./scheduling";

describe("appointmentsOverlap", () => {
  const existingStart = new Date("2026-09-03T16:00:00.000Z");

  it("detects appointments that begin during an existing visit", () => {
    expect(appointmentsOverlap(new Date("2026-09-03T16:30:00.000Z"), 30, existingStart, 60)).toBe(true);
  });

  it("detects appointments that contain an existing visit", () => {
    expect(appointmentsOverlap(new Date("2026-09-03T15:30:00.000Z"), 120, existingStart, 60)).toBe(true);
  });

  it("allows appointments that meet exactly at their boundaries", () => {
    expect(appointmentsOverlap(new Date("2026-09-03T17:00:00.000Z"), 30, existingStart, 60)).toBe(false);
  });
});

describe("canFinalizeAppointment", () => {
  const startAt = new Date("2026-09-03T16:00:00.000Z");

  it("locks a confirmed appointment until its estimated end", () => {
    expect(canFinalizeAppointment("CONFIRMED", startAt, 60, new Date("2026-09-03T16:59:59.000Z"))).toBe(false);
  });

  it("allows finalization after the confirmed visit ends", () => {
    expect(canFinalizeAppointment("CONFIRMED", startAt, 60, new Date("2026-09-03T17:00:00.000Z"))).toBe(true);
  });

  it("never finalizes an appointment that is only scheduled", () => {
    expect(canFinalizeAppointment("SCHEDULED", startAt, 60, new Date("2026-09-04T17:00:00.000Z"))).toBe(false);
  });
});
