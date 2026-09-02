"use server";

import { addDays, subDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { appointmentsOverlap } from "@/lib/scheduling";
import { formatBusinessDate, parseBusinessDateTime } from "@/lib/time";
import { appointmentSchema, completionSchema } from "@/lib/validation";

async function findConflict(startAt: Date, duration: number, excludeId?: string) {
  const candidates = await prisma.appointment.findMany({
    where: { id: excludeId ? { not: excludeId } : undefined, status: { in: ["SCHEDULED", "CONFIRMED"] }, startAt: { gte: subDays(startAt, 1), lt: addDays(startAt, 1) } },
    include: { customer: true },
    orderBy: { startAt: "asc" },
  });
  return candidates.find((item) => appointmentsOverlap(startAt, duration, item.startAt, item.expectedDurationMinutes));
}

function conflictMessage(conflict: NonNullable<Awaited<ReturnType<typeof findConflict>>>, timezone: string) {
  return `${customerName(conflict.customer)} already has ${conflict.serviceNameSnapshot} scheduled for ${formatBusinessDate(conflict.startAt, "en", timezone)} (${conflict.expectedDurationMinutes} min). Choose another time.`;
}

export async function checkAppointmentAvailability(startAtInput: string, duration: number, excludeId?: string) {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startAtInput) || !Number.isInteger(duration) || duration < 5 || duration > 1440) {
    return { available: false, message: "Choose a valid date, time, and estimated duration." };
  }
  const timezone = user.settings?.timezone || "America/Toronto";
  const startAt = parseBusinessDateTime(startAtInput, timezone);
  const conflict = await findConflict(startAt, duration, excludeId);
  return conflict
    ? { available: false, message: conflictMessage(conflict, timezone), conflictId: conflict.id }
    : { available: true, message: "This time is available." };
}

export async function createAppointment(formData: FormData) {
  const user = await requireUser();
  const data = appointmentSchema.parse({ ...Object.fromEntries(formData), serviceIds: formData.getAll("serviceIds") });
  const timezone = user.settings?.timezone || "America/Toronto";
  const startAt = parseBusinessDateTime(data.startAt, timezone);
  const conflict = await findConflict(startAt, data.expectedDurationMinutes);
  if (conflict) return { error: conflictMessage(conflict, timezone) };
  const services = await prisma.service.findMany({ where: { id: { in: data.serviceIds }, active: true } });
  if (services.length !== data.serviceIds.length) return { error: "One or more selected services are unavailable. Refresh and try again." };
  const orderedServices = data.serviceIds.map((id) => services.find((service) => service.id === id)!);
  if (new Set(orderedServices.map((service) => service.currency)).size > 1) return { error: "Selected services must use the same currency." };
  const { serviceIds: _, ...appointmentData } = data;
  void _;
  const primaryService = orderedServices[0];
  const appointment = await prisma.appointment.create({ data: {
    ...appointmentData,
    startAt,
    serviceId: primaryService.id,
    serviceNameSnapshot: orderedServices.map((service) => service.name).join(" + "),
    currency: primaryService.currency,
    serviceLines: { create: orderedServices.map((service, position) => ({ serviceId: service.id, serviceNameSnapshot: service.name, durationMinutes: service.defaultDurationMinutes, price: service.defaultPrice, position })) },
  } });
  revalidatePath("/appointments");
  redirect(`/appointments/${appointment.id}`);
}

export async function updateAppointment(id: string, formData: FormData) {
  const user = await requireUser();
  const data = appointmentSchema.parse({ ...Object.fromEntries(formData), serviceIds: formData.getAll("serviceIds") });
  const timezone = user.settings?.timezone || "America/Toronto";
  const startAt = parseBusinessDateTime(data.startAt, timezone);
  const conflict = await findConflict(startAt, data.expectedDurationMinutes, id);
  if (conflict) return { error: conflictMessage(conflict, timezone) };
  const services = await prisma.service.findMany({ where: { id: { in: data.serviceIds } } });
  if (services.length !== data.serviceIds.length) return { error: "One or more selected services are unavailable. Refresh and try again." };
  const orderedServices = data.serviceIds.map((serviceId) => services.find((service) => service.id === serviceId)!);
  if (new Set(orderedServices.map((service) => service.currency)).size > 1) return { error: "Selected services must use the same currency." };
  const { serviceIds: _, ...appointmentData } = data;
  void _;
  const primaryService = orderedServices[0];
  await prisma.appointment.update({ where: { id }, data: {
    ...appointmentData,
    startAt,
    serviceId: primaryService.id,
    serviceNameSnapshot: orderedServices.map((service) => service.name).join(" + "),
    currency: primaryService.currency,
    serviceLines: { deleteMany: {}, create: orderedServices.map((service, position) => ({ serviceId: service.id, serviceNameSnapshot: service.name, durationMinutes: service.defaultDurationMinutes, price: service.defaultPrice, position })) },
  } });
  revalidatePath(`/appointments/${id}`);
  redirect(`/appointments/${id}`);
}

export async function completeAppointment(id: string, formData: FormData) {
  await requireUser();
  const data = completionSchema.parse(Object.fromEntries(formData));
  await prisma.appointment.update({ where: { id }, data: { ...data, status: "COMPLETED", completedAt: new Date() } });
  revalidatePath("/dashboard"); revalidatePath("/reports"); revalidatePath("/appointments"); revalidatePath("/working-hours"); revalidatePath(`/appointments/${id}`);
  redirect(`/appointments/${id}`);
}

export async function setAppointmentStatus(id: string, status: "CANCELLED" | "NO_SHOW" | "CONFIRMED") {
  await requireUser();
  await prisma.appointment.update({ where: { id }, data: { status } });
  revalidatePath(`/appointments/${id}`); revalidatePath("/appointments");
}

export async function markPaid(id: string) {
  await requireUser();
  await prisma.appointment.update({ where: { id }, data: { paymentStatus: "PAID" } });
  revalidatePath(`/appointments/${id}`); revalidatePath("/dashboard");
}
