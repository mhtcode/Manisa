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
  const data = appointmentSchema.parse(Object.fromEntries(formData));
  const timezone = user.settings?.timezone || "America/Toronto";
  const startAt = parseBusinessDateTime(data.startAt, timezone);
  await assertNoConflict(startAt, data.expectedDurationMinutes);
  const service = await prisma.service.findUniqueOrThrow({ where: { id: data.serviceId } });
  const appointment = await prisma.appointment.create({ data: { ...data, startAt, serviceNameSnapshot: service.name, currency: service.currency } });
  revalidatePath("/appointments");
  redirect(`/appointments/${appointment.id}`);
}

export async function updateAppointment(id: string, formData: FormData) {
  const user = await requireUser();
  const data = appointmentSchema.parse(Object.fromEntries(formData));
  const startAt = parseBusinessDateTime(data.startAt, user.settings?.timezone || "America/Toronto");
  await assertNoConflict(startAt, data.expectedDurationMinutes, id);
  const service = await prisma.service.findUniqueOrThrow({ where: { id: data.serviceId } });
  await prisma.appointment.update({ where: { id }, data: { ...data, startAt, serviceNameSnapshot: service.name, currency: service.currency } });
  revalidatePath(`/appointments/${id}`);
  redirect(`/appointments/${id}`);
}

export async function completeAppointment(id: string, formData: FormData) {
  await requireUser();
  const data = completionSchema.parse(Object.fromEntries(formData));
  const service = await prisma.service.findUniqueOrThrow({ where: { id: data.serviceId } });
  await prisma.appointment.update({ where: { id }, data: { ...data, serviceNameSnapshot: service.name, status: "COMPLETED", completedAt: new Date() } });
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
