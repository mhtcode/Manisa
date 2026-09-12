import { appointmentsOverlap } from "./scheduling";
import type { BusinessPermission } from "./permissions";

export const notificationKinds = [
  "BOOKING_REQUEST",
  "REVIEW_SUBMITTED",
  "APPOINTMENT_CONFIRMATION",
  "APPOINTMENT_FINALIZATION",
  "PAYMENT_ATTENTION",
] as const;

export type NotificationKind = (typeof notificationKinds)[number];
export type OccupiedInterval = { startAt: Date; durationMinutes: number };

export function bookingRequestConflicts(startAt: Date, durationMinutes: number, occupied: OccupiedInterval[]) {
  return occupied.some((item) => appointmentsOverlap(startAt, durationMinutes, item.startAt, item.durationMinutes));
}

export function normalizeBookingPhone(value: string) {
  const trimmed = value.normalize("NFKC").trim();
  return `${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
}

export function normalizeBookingEmail(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-CA");
}

export function normalizeNotificationHref(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/report";
}

export function canReviewBookingRequest(status: string) {
  return status === "PENDING";
}

export function notificationPermission(kind: NotificationKind): BusinessPermission {
  if (kind === "REVIEW_SUBMITTED") return "reviews.manage";
  if (kind === "PAYMENT_ATTENTION") return "payments.manage";
  return "appointments.manage";
}
