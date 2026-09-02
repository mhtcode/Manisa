import { fromZonedTime } from "date-fns-tz";

export type CalendarImportEvent = {
  sourceId: string;
  customerName: string;
  serviceName: string;
  startAt: Date;
  durationMinutes: number;
  phone?: string;
  email?: string;
  description?: string;
};

type Property = { params: Record<string, string>; value: string };

function unescapeIcs(value: string) {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseProperty(line: string): [string, Property] | null {
  const separator = line.indexOf(":");
  if (separator < 0) return null;
  const [name, ...rawParams] = line.slice(0, separator).split(";");
  const params = Object.fromEntries(rawParams.map((part) => {
    const [key, ...value] = part.split("=");
    return [key.toUpperCase(), value.join("=")];
  }));
  return [name.toUpperCase(), { params, value: line.slice(separator + 1) }];
}

function parseDate(property: Property, fallbackTimezone: string) {
  const value = property.value.trim();
  if (property.params.VALUE === "DATE" || /^\d{8}$/.test(value)) return null;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "00", utc] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  const date = utc ? new Date(`${iso}Z`) : fromZonedTime(iso, property.params.TZID || fallbackTimezone);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function descriptionValue(description: string, label: string) {
  const line = description.split(/\r?\n/).find((item) => item.toLocaleLowerCase().startsWith(`${label.toLocaleLowerCase()}:`));
  return line?.slice(line.indexOf(":") + 1).trim() || undefined;
}

export function parseGoogleCalendarIcs(source: string, fallbackTimezone: string) {
  const unfolded = source.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const blocks = [...unfolded.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)\r?\nEND:VEVENT/g)].map((match) => match[1]);
  const events: CalendarImportEvent[] = [];
  const issues: string[] = [];

  blocks.forEach((block, index) => {
    const properties = new Map<string, Property>();
    block.split(/\r?\n/).forEach((line) => {
      const parsed = parseProperty(line);
      if (parsed && !properties.has(parsed[0])) properties.set(parsed[0], parsed[1]);
    });
    const summary = unescapeIcs(properties.get("SUMMARY")?.value || "");
    const [customerName, ...serviceParts] = summary.split("|").map((part) => part.trim());
    const serviceName = serviceParts.join(" | ").trim();
    const uid = properties.get("UID")?.value.trim();
    const startAt = properties.get("DTSTART") ? parseDate(properties.get("DTSTART")!, fallbackTimezone) : null;
    const endAt = properties.get("DTEND") ? parseDate(properties.get("DTEND")!, fallbackTimezone) : null;
    const durationMinutes = startAt && endAt ? Math.round((endAt.valueOf() - startAt.valueOf()) / 60_000) : 0;

    if (!customerName || !serviceName || !uid || !startAt || durationMinutes < 5 || durationMinutes > 1440) {
      issues.push(`Event ${index + 1} was skipped. Use “Customer name | Service name” and include a timed start and end.`);
      return;
    }

    const description = unescapeIcs(properties.get("DESCRIPTION")?.value || "").trim();
    events.push({
      sourceId: `${uid}:${startAt.toISOString()}`,
      customerName,
      serviceName,
      startAt,
      durationMinutes,
      phone: descriptionValue(description, "Phone"),
      email: descriptionValue(description, "Email"),
      description: description || undefined,
    });
  });

  if (!blocks.length) issues.push("No Google Calendar events were found in this file.");
  return { events, issues };
}
