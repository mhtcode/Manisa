import { describe, expect, it } from "vitest";
import { googleEventPayload, stableGoogleEventId } from "./google-calendar";

describe("Google Calendar event identity", () => {
  it("is stable, unique, and accepted by Google event-id rules", () => {
    const first = stableGoogleEventId("appointment-1");
    expect(first).toBe(stableGoogleEventId("appointment-1"));
    expect(first).not.toBe(stableGoogleEventId("appointment-2"));
    expect(first).toMatch(/^[a-v0-9]{5,1024}$/);
  });

  it("publishes useful details without private contact or payment data", () => {
    const payload = googleEventPayload({ id: "a1", status: "CONFIRMED", startAt: new Date("2026-09-05T14:00:00Z"), expectedDurationMinutes: 60, serviceNameSnapshot: "Manicure", customer: { firstName: "Fahime", lastName: "M", displayName: null } }, "https://manisa.example");
    expect(payload.summary).toContain("Fahime M — Manicure");
    expect(payload.description).toContain("https://manisa.example/appointments/a1");
    expect(JSON.stringify(payload)).not.toMatch(/phone|email|payment|notes|photo/i);
  });
});
