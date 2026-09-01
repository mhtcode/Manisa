import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
export const DEFAULT_TIMEZONE = "America/Toronto";
export function parseBusinessDateTime(value: string, timezone = DEFAULT_TIMEZONE) { return fromZonedTime(value, timezone); }
export function formatBusinessDate(date: Date, locale: "en" | "fa", timezone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(date);
}
export function toDateTimeInput(date: Date, timezone = DEFAULT_TIMEZONE) { return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm"); }
