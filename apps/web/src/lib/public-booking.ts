import { fromZonedTime } from "date-fns-tz";
import { appointmentsOverlap } from "./scheduling";

export type PublicBookingWindow = {
  date: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  durationMinutes: number;
  leadHours: number;
  enabledWeekdays: number[];
  explicitStartTimes?: string[];
};

export type OccupiedAppointment = { startAt: Date; durationMinutes: number };

export function validDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).valueOf());
}

export function parseClock(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function bookingWeekdays(value: string) {
  return [...new Set(value.split(",").map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort();
}

export function normalizeBookingWindows(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string[]> = {};
  for (const [day, times] of Object.entries(value)) {
    if (!/^[0-6]$/.test(day) || !Array.isArray(times)) continue;
    const valid = [...new Set(times.filter((time): time is string => typeof time === "string" && parseClock(time) !== null))].sort();
    if (valid.length) result[day] = valid;
  }
  return result;
}

export function buildPublicBookingSlots(window: PublicBookingWindow, occupied: OccupiedAppointment[], now = new Date()) {
  if (!validDateKey(window.date) || !window.enabledWeekdays.includes(new Date(`${window.date}T12:00:00Z`).getUTCDay())) return [];
  const opening = parseClock(window.openTime);
  const closing = parseClock(window.closeTime);
  if (opening === null || closing === null || opening >= closing || window.durationMinutes < 5) return [];
  const interval = Math.min(240, Math.max(5, Math.round(window.slotMinutes)));
  const firstAllowed = new Date(now.getTime() + Math.max(0, window.leadHours) * 60 * 60 * 1000);
  const slots: string[] = [];
  const candidates = window.explicitStartTimes?.length
    ? window.explicitStartTimes.map(parseClock).filter((minute): minute is number => minute !== null)
    : Array.from({ length: Math.ceil((closing - opening) / interval) }, (_, index) => opening + index * interval);
  for (const minute of candidates) {
    if (minute < opening || minute + window.durationMinutes > closing) continue;
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const startAt = fromZonedTime(`${window.date}T${time}:00`, window.timezone);
    if (startAt < firstAllowed) continue;
    if (occupied.some((appointment) => appointmentsOverlap(startAt, window.durationMinutes, appointment.startAt, appointment.durationMinutes))) continue;
    slots.push(time);
  }
  return slots;
}
