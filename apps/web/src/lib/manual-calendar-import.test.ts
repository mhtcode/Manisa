import { describe, expect, it } from "vitest";
import { parseManualCalendarJson } from "./manual-calendar-import";

const valid = JSON.stringify({ appointments: [{
  externalId: "legacy-1",
  startAt: "2026-09-12T14:30:00-04:00",
  customer: { name: "Sara Ahmadi", phone: "+14165550199", preferredLanguage: "fa" },
  services: [{ name: "Gel manicure", category: { name: "Nails", icon: "nail", accentColor: "#60A5FA" }, durationMinutes: 60, price: 75 }],
}] });

describe("manual calendar JSON", () => {
  it("accepts a complete batch payload and creates a stable manual source id", () => {
    const first = parseManualCalendarJson(valid, "America/Toronto");
    const second = parseManualCalendarJson(valid, "America/Toronto");
    expect(first.issues).toEqual([]);
    expect(first.appointments).toHaveLength(1);
    expect(first.appointments[0].sourceId).toBe(second.appointments[0].sourceId);
    expect(first.appointments[0].sourceId).toMatch(/^manual:/);
  });

  it("interprets zone-less timestamps in the studio timezone", () => {
    const source = valid.replace("2026-09-12T14:30:00-04:00", "2026-09-12T14:30:00");
    expect(parseManualCalendarJson(source, "America/Toronto").appointments[0].startDate.toISOString()).toBe("2026-09-12T18:30:00.000Z");
  });

  it("rejects malformed data without returning a partial batch", () => {
    const result = parseManualCalendarJson(JSON.stringify([{ startAt: "bad", customer: { name: "A" }, services: [] }]), "America/Toronto");
    expect(result.appointments).toEqual([]);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
