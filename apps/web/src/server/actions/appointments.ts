"use server";

import { addMinutes, endOfDay, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBusinessDateTime } from "@/lib/time";
import { appointmentSchema, completionSchema } from "@/lib/validation";

async function assertNoConflict(startAt: Date, duration: number, excludeId?: string) {
  const candidates = await prisma.appointment.findMany({
    where: { id: excludeId ? { not: excludeId } : undefined, status: { in: ["SCHEDULED", "CONFIRMED"] }, startAt: { gte: startOfDay(startAt), lte: endOfDay(startAt) } },
    select: { startAt: true, expectedDurationMinutes: true },
  });
  const endAt = addMinutes(startAt, duration);
  if (candidates.some((item) => startAt < addMinutes(item.startAt, item.expectedDurationMinutes) && endAt > item.startAt)) {
    throw new Error("This appointment overlaps another scheduled appointment.");
  }
}

export async function createAppointment(formData: FormData) {
  const user = await requireUser();
  const data = appointmentSchema.parse({ ...Object.fromEntries(formData), serviceIds: formData.getAll("serviceIds") });
  const timezone = user.settings?.timezone || "America/Toronto";
  const startAt = parseBusinessDateTime(data.startAt, timezone);
  await assertNoConflict(startAt, data.expectedDurationMinutes);
  const services = await prisma.service.findMany({ where: { id: { in: data.serviceIds }, active: true } });
  if (services.length !== data.serviceIds.length) throw new Error("One or more selected services are unavailable.");
  const orderedServices = data.serviceIds.map((id) => services.find((service) => service.id === id)!);
  if (new Set(orderedServices.map((service) => service.currency)).size > 1) throw new Error("Selected services must use the same currency.");
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
  const startAt = parseBusinessDateTime(data.startAt, user.settings?.timezone || "America/Toronto");
  await assertNoConflict(startAt, data.expectedDurationMinutes, id);
  const services = await prisma.service.findMany({ where: { id: { in: data.serviceIds } } });
  if (services.length !== data.serviceIds.length) throw new Error("One or more selected services are unavailable.");
  const orderedServices = data.serviceIds.map((serviceId) => services.find((service) => service.id === serviceId)!);
  if (new Set(orderedServices.map((service) => service.currency)).size > 1) throw new Error("Selected services must use the same currency.");
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
  revalidatePath("/dashboard"); revalidatePath("/reports"); revalidatePath(`/appointments/${id}`);
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
