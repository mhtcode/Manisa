import "server-only";

import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { buildPublicBookingSlots, normalizeBookingWindows, validDateKey } from "@/lib/public-booking";
import { prisma } from "@/lib/prisma";

export async function getPublicBookingAvailability(date: string, requestedServiceIds: string[], now = new Date()) {
  const serviceIds = [...new Set(requestedServiceIds)].filter((id) => /^[-_a-zA-Z0-9]{1,100}$/.test(id)).slice(0, 12);
  const settings = await prisma.studioSettings.findUnique({ where: { id: "studio" } });
  if (!settings?.publicBookingEnabled) return { available: false as const, error: "Online booking is not available." };
  if (!validDateKey(date) || !serviceIds.length) return { available: false as const, error: "Choose a date and at least one service." };
  const today = formatInTimeZone(now, settings.timezone, "yyyy-MM-dd");
  const lastDay = formatInTimeZone(addDays(now, 90), settings.timezone, "yyyy-MM-dd");
  if (date < today || date > lastDay) return { available: false as const, error: "Choose a date within the next 90 days." };
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds }, active: true, deletedAt: null, category: { active: true, deletedAt: null } }, select: { id: true, name: true, defaultDurationMinutes: true, defaultPrice: true, currency: true } });
  if (services.length !== serviceIds.length) return { available: false as const, error: "One or more services are no longer available." };
  const orderedServices = serviceIds.map((id) => services.find((service) => service.id === id)!);
  if (new Set(orderedServices.map((service) => service.currency)).size > 1) return { available: false as const, error: "Selected services use different currencies." };
  const durationMinutes = orderedServices.reduce((sum, service) => sum + service.defaultDurationMinutes, 0);
  const dayStart = fromZonedTime(`${date}T00:00:00`, settings.timezone);
  const nextKey = new Date(`${date}T12:00:00Z`); nextKey.setUTCDate(nextKey.getUTCDate() + 1);
  const dayEnd = fromZonedTime(`${nextKey.toISOString().slice(0, 10)}T00:00:00`, settings.timezone);
  const [appointments, requests] = await Promise.all([
    prisma.appointment.findMany({ where: { deletedAt: null, status: { in: ["REQUESTED", "SCHEDULED", "CONFIRMED"] }, startAt: { gte: addDays(dayStart, -1), lt: addDays(dayEnd, 1) } }, select: { startAt: true, expectedDurationMinutes: true } }),
    prisma.publicBookingRequest.findMany({ where: { status: "PENDING", requestedStartAt: { gte: addDays(dayStart, -1), lt: addDays(dayEnd, 1) } }, select: { requestedStartAt: true, durationMinutes: true } }),
  ]);
  const windows = normalizeBookingWindows(settings.publicBookingWindows);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const explicitStartTimes = windows[String(weekday)] || [];
  const occupied = [
    ...appointments.map((appointment) => ({ startAt: appointment.startAt, durationMinutes: appointment.expectedDurationMinutes })),
    ...requests.map((request) => ({ startAt: request.requestedStartAt, durationMinutes: request.durationMinutes })),
  ];
  const slots = buildPublicBookingSlots({ date, timezone: settings.timezone, openTime: "00:00", closeTime: "23:59", slotMinutes: 30, durationMinutes, leadHours: settings.publicBookingLeadHours, enabledWeekdays: explicitStartTimes.length ? [weekday] : [], explicitStartTimes }, occupied, now);
  return { available: true as const, slots, durationMinutes, currency: orderedServices[0].currency, totalPrice: orderedServices.reduce((sum, service) => sum + Number(service.defaultPrice), 0).toFixed(2), services: orderedServices };
}
