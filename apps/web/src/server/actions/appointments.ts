"use server";

import { addDays, subDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { customerName } from "@/lib/format";
import { PhotoUploadError, prepareAppointmentPhotos, removePreparedPhotos } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { appointmentExpectedEnd, appointmentsOverlap, canFinalizeAppointment } from "@/lib/scheduling";
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

function selectedColor(formData: FormData, serviceId: string, supportsColor: boolean) {
  if (!supportsColor) return null;
  const value = formData.get(`serviceColor_${serviceId}`);
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : null;
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
    serviceLines: { create: orderedServices.map((service, position) => ({ serviceId: service.id, serviceNameSnapshot: service.name, durationMinutes: service.defaultDurationMinutes, price: service.defaultPrice, selectedColor: selectedColor(formData, service.id, service.supportsColor), position })) },
  } });
  revalidatePath("/appointments");
  redirect(`/appointments/${appointment.id}`);
}

export async function updateAppointment(id: string, formData: FormData) {
  const user = await requireUser();
  const current = await prisma.appointment.findUnique({ where: { id }, select: { status: true } });
  if (!current || !["SCHEDULED", "CONFIRMED"].includes(current.status)) return { error: "Only scheduled or confirmed appointments can be edited." };
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
    serviceLines: { deleteMany: {}, create: orderedServices.map((service, position) => ({ serviceId: service.id, serviceNameSnapshot: service.name, durationMinutes: service.defaultDurationMinutes, price: service.defaultPrice, selectedColor: selectedColor(formData, service.id, service.supportsColor), position })) },
  } });
  revalidatePath(`/appointments/${id}`);
  redirect(`/appointments/${id}`);
}

export async function completeAppointment(id: string, formData: FormData) {
  await requireUser();
  const data = completionSchema.parse({ ...Object.fromEntries(formData), actualServiceIds: formData.getAll("actualServiceIds") });
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) return { error: "Appointment not found." };
  if (appointment.status !== "CONFIRMED") return { error: "Confirm this appointment before finalizing it." };
  const expectedEnd = appointmentExpectedEnd(appointment.startAt, appointment.expectedDurationMinutes);
  if (!canFinalizeAppointment(appointment.status, appointment.startAt, appointment.expectedDurationMinutes)) return { error: `This visit cannot be finalized until its estimated end time (${formatBusinessDate(expectedEnd, "en")}).` };
  const services = await prisma.service.findMany({ where: { id: { in: data.actualServiceIds } } });
  if (services.length !== data.actualServiceIds.length) return { error: "One or more actual services could not be found." };
  const orderedServices = data.actualServiceIds.map((serviceId) => services.find((service) => service.id === serviceId)!);
  if (new Set(orderedServices.map((service) => service.currency)).size > 1) return { error: "Actual services must use the same currency." };
  const actualLines = [];
  for (const [position, service] of orderedServices.entries()) {
    const duration = Number(formData.get(`actualDuration_${service.id}`));
    const price = formData.get(`actualPrice_${service.id}`);
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) return { error: `Enter a valid duration for ${service.name}.` };
    if (typeof price !== "string" || !/^\d{1,10}(\.\d{1,2})?$/.test(price)) return { error: `Enter a valid final price for ${service.name}.` };
    actualLines.push({ serviceId: service.id, serviceNameSnapshot: service.name, actualDurationMinutes: duration, finalPrice: price, selectedColor: selectedColor(formData, service.id, service.supportsColor), position });
  }
  const actualDurationMinutes = actualLines.reduce((sum, line) => sum + line.actualDurationMinutes, 0);
  const finalPrice = actualLines.reduce((sum, line) => sum + Number(line.finalPrice), 0).toFixed(2);
  const primaryService = orderedServices[0];
  let photos;
  try { photos = await prepareAppointmentPhotos(id, formData); }
  catch (error) { return { error: error instanceof PhotoUploadError ? error.message : "The photos could not be uploaded." }; }
  try {
    await prisma.appointment.update({ where: { id }, data: {
      status: "COMPLETED",
      completedAt: new Date(),
      paymentStatus: data.paymentStatus,
      completionNotes: data.completionNotes,
      actualDurationMinutes,
      finalPrice,
      serviceId: primaryService.id,
      serviceNameSnapshot: orderedServices.map((service) => service.name).join(" + "),
      currency: primaryService.currency,
      actualServiceLines: { deleteMany: {}, create: actualLines },
      photos: { create: photos },
    } });
  } catch (error) {
    await removePreparedPhotos(photos);
    throw error;
  }
  revalidatePath("/report"); revalidatePath("/appointments"); revalidatePath("/gallery"); revalidatePath(`/appointments/${id}`);
  redirect(`/appointments/${id}`);
}

export async function addAppointmentPhotos(id: string, _previous: { error?: string; success?: string } | null, formData: FormData) {
  await requireUser();
  const appointment = await prisma.appointment.findUnique({ where: { id }, select: { status: true } });
  if (!appointment) return { error: "Appointment not found." };
  if (appointment.status !== "COMPLETED") return { error: "Photos can only be added to a finalized appointment." };

  let photos;
  try {
    photos = await prepareAppointmentPhotos(id, formData);
    if (!photos.length) return { error: "Choose at least one photo to upload." };
  } catch (error) {
    return { error: error instanceof PhotoUploadError ? error.message : "The photos could not be uploaded." };
  }

  try { await prisma.appointmentPhoto.createMany({ data: photos.map((photo) => ({ ...photo, appointmentId: id })) }); }
  catch (error) { await removePreparedPhotos(photos); throw error; }
  revalidatePath(`/appointments/${id}`);
  revalidatePath("/gallery");
  return { success: `${photos.length} ${photos.length === 1 ? "photo" : "photos"} added.`, resetKey: photos[0].imagePath };
}

export async function setAppointmentStatus(id: string, status: "CANCELLED" | "NO_SHOW" | "CONFIRMED") {
  await requireUser();
  const appointment = await prisma.appointment.findUnique({ where: { id }, select: { status: true, startAt: true } });
  if (!appointment) throw new Error("Appointment not found.");
  if (status === "CONFIRMED" && appointment.status !== "SCHEDULED") throw new Error("Only scheduled appointments can be confirmed.");
  if (status === "CANCELLED" && !["SCHEDULED", "CONFIRMED"].includes(appointment.status)) throw new Error("Only upcoming appointments can be cancelled.");
  if (status === "NO_SHOW" && (!["SCHEDULED", "CONFIRMED"].includes(appointment.status) || appointment.startAt > new Date())) throw new Error("A future appointment cannot be marked as no-show.");
  await prisma.appointment.update({ where: { id }, data: { status } });
  revalidatePath(`/appointments/${id}`); revalidatePath("/appointments"); revalidatePath("/calendar"); revalidatePath("/report");
}

export async function markPaid(id: string) {
  await requireUser();
  await prisma.appointment.updateMany({ where: { id, status: "COMPLETED" }, data: { paymentStatus: "PAID" } });
  revalidatePath(`/appointments/${id}`); revalidatePath("/report");
}
