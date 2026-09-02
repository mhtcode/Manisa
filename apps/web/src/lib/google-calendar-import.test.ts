import { describe, expect, it } from "vitest";
import { parseGoogleCalendarIcs } from "./google-calendar-import";

describe("parseGoogleCalendarIcs", () => {
  it("parses Unicode customer and service names with contact details", () => {
    const source = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:google-123",
      "DTSTART;TZID=America/Toronto:20260815T100000",
      "DTEND;TZID=America/Toronto:20260815T113000",
      "SUMMARY:نگار رضایی | کاشت ناخن",
      "DESCRIPTION:Phone: +1 416 555 0106\\nEmail: negar@example.com",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const result = parseGoogleCalendarIcs(source, "America/Toronto");
    expect(result.issues).toEqual([]);
    expect(result.events[0]).toMatchObject({ customerName: "نگار رضایی", serviceName: "کاشت ناخن", durationMinutes: 90, phone: "+1 416 555 0106", email: "negar@example.com" });
  });

  it("skips all-day events and titles without the import separator", () => {
    const source = "BEGIN:VEVENT\nUID:bad\nDTSTART;VALUE=DATE:20260815\nDTEND;VALUE=DATE:20260816\nSUMMARY:Personal day\nEND:VEVENT";
    const result = parseGoogleCalendarIcs(source, "America/Toronto");
    expect(result.events).toHaveLength(0);
    expect(result.issues).toHaveLength(1);
  });
});
