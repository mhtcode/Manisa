"use server";

import { addDays, subDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { requireBusinessPermission } from "@/lib/auth";
import { customerName } from "@/lib/format";
import { PhotoUploadError, prepareAppointmentPhotos, removePreparedPhotos } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { appointmentExpectedEnd, appointmentsOverlap, canFinalizeAppointment } from "@/lib/scheduling";
import { formatBusinessDate, parseBusinessDateTime } from "@/lib/time";
import { appointmentSchema, completionSchema } from "@/lib/validation";
import { parsePaymentInputs, paymentStatusFor } from "@/lib/payments";
import { publishObject, removeObject } from "@/lib/object-storage";
import { enqueueGoogleCalendarSync } from "@/server/google-calendar";

async function findConflict(startAt: Date, duration: number, excludeId?: string) {
  const candidates = await prisma.appointment.findMany({
    where: {id: excludeId ? { not: excludeId } : undefined, deletedAt: null, status: { in: ["SCHEDULED", "CONFIRMED"] }, startAt: { gte: subDays(startAt, 1), lt: addDays(startAt, 1) } },
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
  const user = await requireBusinessPermission("appointments.manage");
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
  const user = await requireBusinessPermission("appointments.manage");
  const data = appointmentSchema.parse({ ...Object.fromEntries(formData), serviceIds: formData.getAll("serviceIds") });
  const timezone = user.settings?.timezone || "America/Toronto";
  const startAt = parseBusinessDateTime(data.startAt, timezone);
  const conflict = await findConflict(startAt, data.expectedDurationMinutes);
  if (conflict) return { error: conflictMessage(conflict, timezone) };
  const customerExists = await prisma.customer.count({ where: { id: data.customerId, deletedAt: null } });
  if (!customerExists) return { error: "The selected customer is not available in this studio." };
  const services = await prisma.service.findMany({ where: { id: { in: data.serviceIds }, active: true, deletedAt: null, category: { deletedAt: null } } });
  if (services.length !== data.serviceIds.length) return { error: "One or more selected services are unavailable. Refresh and try again." };
  const orderedServices = data.serviceIds.map((id) => services.find((service) => service.id === id)!);
  if (new Set(orderedServices.map((service) => service.currency)).size > 1) return { error: "Selected services must use the same currency." };
  const { serviceIds: _, ...appointmentData } = data;
  void _;
  const primaryService = orderedServices[0];
  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({ data: {
      ...appointmentData,       startAt,
      serviceId: primaryService.id,
      serviceNameSnapshot: orderedServices.map((service) => service.name).join(" + "),
      currency: primaryService.currency,
      serviceLines: { create: orderedServices.map((service, position) => ({ serviceId: service.id, serviceNameSnapshot: service.name, durationMinutes: service.defaultDurationMinutes, price: service.defaultPrice, selectedColor: selectedColor(formData, service.id, service.supportsColor), position })) },
    } });
    await enqueueGoogleCalendarSync(tx, [created.id], "UPSERT");
    return created;
  });
  revalidatePath("/appointments");
  return { success: "Appointment scheduled.", redirectTo: `/appointments/${appointment.id}` };
}

export async function updateAppointment(id: string, formData: FormData) {
  const user = await requireBusinessPermission("appointments.manage");
  const current = await prisma.appointment.findFirst({ where: { id, deletedAt: null }, select: { status: true } });
  if (!current || !["SCHEDULED", "CONFIRMED"].includes(current.status)) return { error: "Only scheduled or confirmed appointments can be edited." };
  const data = appointmentSchema.parse({ ...Object.fromEntries(formData), serviceIds: formData.getAll("serviceIds") });
  const timezone = user.settings?.timezone || "America/Toronto";
  const startAt = parseBusinessDateTime(data.startAt, timezone);
  const conflict = await findConflict(startAt, data.expectedDurationMinutes, id);
  if (conflict) return { error: conflictMessage(conflict, timezone) };
  const customerExists = await prisma.customer.count({ where: { id: data.customerId, deletedAt: null } });
  if (!customerExists) return { error: "The selected customer is not available in this studio." };
  const services = await prisma.service.findMany({ where: { id: { in: data.serviceIds }, deletedAt: null } });
  if (services.length !== data.serviceIds.length) return { error: "One or more selected services are unavailable. Refresh and try again." };
  const orderedServices = data.serviceIds.map((serviceId) => services.find((service) => service.id === serviceId)!);
  if (new Set(orderedServices.map((service) => service.currency)).size > 1) return { error: "Selected services must use the same currency." };
  const { serviceIds: _, ...appointmentData } = data;
  void _;
  const primaryService = orderedServices[0];
  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id }, data: {
      ...appointmentData,
      startAt,
      serviceId: primaryService.id,
      serviceNameSnapshot: orderedServices.map((service) => service.name).join(" + "),
      currency: primaryService.currency,
      serviceLines: { deleteMany: {}, create: orderedServices.map((service, position) => ({ serviceId: service.id, serviceNameSnapshot: service.name, durationMinutes: service.defaultDurationMinutes, price: service.defaultPrice, selectedColor: selectedColor(formData, service.id, service.supportsColor), position })) },
    } });
    await enqueueGoogleCalendarSync(tx, [id], "UPSERT");
  });
  revalidatePath(`/appointments/${id}`);
  return { success: "Appointment updated.", redirectTo: `/appointments/${id}` };
}

export async function completeAppointment(id: string, formData: FormData) {
  const user = await requireBusinessPermission("appointments.manage");
  const data = completionSchema.parse({ ...Object.fromEntries(formData), actualServiceIds: formData.getAll("actualServiceIds") });
  const appointment = await prisma.appointment.findFirst({ where: { id, deletedAt: null } });
  if (!appointment) return { error: "Appointment not found." };
  if (appointment.status !== "CONFIRMED") return { error: "Confirm this appointment before finalizing it." };
  const expectedEnd = appointmentExpectedEnd(appointment.startAt, appointment.expectedDurationMinutes);
  if (!canFinalizeAppointment(appointment.status, appointment.startAt, appointment.expectedDurationMinutes)) return { error: `This visit cannot be finalized until its estimated end time (${formatBusinessDate(expectedEnd, "en")}).` };
  const services = await prisma.service.findMany({ where: { id: { in: data.actualServiceIds }, deletedAt: null } });
  if (services.length !== data.actualServiceIds.length) return { error: "One or more actual services could not be found." };
  const orderedServices = data.actualServiceIds.map((serviceId) => services.find((service) => service.id === serviceId)!);
  if (new Set(orderedServices.map((service) => service.currency)).size > 1) return { error: "Actual services must use the same currency." };
  const actualLines: Array<{ serviceId: string; serviceNameSnapshot: string; actualDurationMinutes: number; finalPrice: string; selectedColor: string | null; position: number }> = [];
  for (const [position, service] of orderedServices.entries()) {
    const duration = Number(formData.get(`actualDuration_${service.id}`));
    const price = formData.get(`actualPrice_${service.id}`);
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) return { error: `Enter a valid duration for ${service.name}.` };
    if (typeof price !== "string" || !/^\d{1,10}(\.\d{1,2})?$/.test(price)) return { error: `Enter a valid final price for ${service.name}.` };
    actualLines.push({ serviceId: service.id, serviceNameSnapshot: service.name, actualDurationMinutes: duration, finalPrice: price, selectedColor: selectedColor(formData, service.id, service.supportsColor), position });
  }
  const actualDurationMinutes = actualLines.reduce((sum, line) => sum + line.actualDurationMinutes, 0);
  const finalPrice = actualLines.reduce((sum, line) => sum + Number(line.finalPrice), 0).toFixed(2);
  const paymentInputs = parsePaymentInputs(formData);
  const methods = await prisma.paymentMethod.findMany({ where: { id: { in: paymentInputs.map((item) => item.methodId) }, active: true, deletedAt: null }, include: { defaultAccount: true } });
  if (methods.length !== new Set(paymentInputs.map((item) => item.methodId)).size) return { error: "Choose a valid payment method for every payment." };
  if (paymentInputs.some((item) => !/^\d{1,10}(\.\d{1,2})?$/.test(item.amount) || Number(item.amount) <= 0)) return { error: "Enter a valid positive amount for every payment." };
  const paidAmount = paymentInputs.reduce((sum, item) => sum + Number(item.amount), 0);
  if (paidAmount > Number(finalPrice) + 0.001) return { error: "Recorded payments cannot exceed the final price." };
  const primaryService = orderedServices[0];
  const [incomeCategory, fallbackAccount] = await Promise.all([
    prisma.financialCategory.findFirst({ where: { name: "Appointment services", type: "INCOME", deletedAt: null } }),
    prisma.financialAccount.findFirst({ where: { name: "Undeposited funds", deletedAt: null } }),
  ]);
  if (paymentInputs.length && (!incomeCategory || !fallbackAccount)) return { error: "Configure financial accounts before recording payments." };
  let photos;
  try { photos = await prepareAppointmentPhotos(id, formData); }
  catch (error) { return { error: error instanceof PhotoUploadError ? error.message : "The photos could not be uploaded." }; }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id }, data: {
      status: "COMPLETED",
      completedAt: new Date(),
      paymentStatus: paymentStatusFor(Number(finalPrice), paidAmount),
      paymentReconciliationRequired: false,
      completionNotes: data.completionNotes,
      actualDurationMinutes,
      finalPrice,
      serviceId: primaryService.id,
      serviceNameSnapshot: orderedServices.map((service) => service.name).join(" + "),
      currency: primaryService.currency,
      actualServiceLines: { deleteMany: {}, create: actualLines },
      photos: { create: photos.map((photo) => ({ ...photo, })) },
      } });
      for (const payment of paymentInputs) {
        const method = methods.find((item) => item.id === payment.methodId)!;
        const account = method.defaultAccount || fallbackAccount!;
        const transaction = await tx.financialTransaction.create({ data: { type: "APPOINTMENT_PAYMENT", accountId: account.id, categoryId: incomeCategory!.id, accountNameSnapshot: account.name, categoryNameSnapshot: incomeCategory!.name, amount: payment.amount, currency: primaryService.currency, occurredAt: new Date(), description: `Appointment payment · ${orderedServices.map((service) => service.name).join(" + ")}`, createdById: user.id } });
        await tx.appointmentPayment.create({ data: { appointmentId: id, paymentMethodId: method.id, methodNameSnapshot: method.name, amount: payment.amount, recordedById: user.id, transactionId: transaction.id } });
      }
      await enqueueGoogleCalendarSync(tx, [id], "UPSERT");
    });
  } catch (error) {
    await removePreparedPhotos(photos);
    throw error;
  }
  revalidatePath("/report"); revalidatePath("/appointments"); revalidatePath("/gallery"); revalidatePath(`/appointments/${id}`);
  return { success: "Appointment finalized.", redirectTo: `/appointments/${id}` };
}

export async function addAppointmentPhotos(id: string, _previous: { error?: string; success?: string } | null, formData: FormData) {
  const user = await requireBusinessPermission("appointments.manage");
  const appointment = await prisma.appointment.findFirst({ where: { id, deletedAt: null }, select: { status: true } });
  if (!appointment) return { error: "Appointment not found." };
  if (appointment.status !== "COMPLETED") return { error: "Photos can only be added to a finalized appointment." };

  let photos;
  try {
    photos = await prepareAppointmentPhotos(id, formData);
    if (!photos.length) return { error: "Choose at least one photo to upload." };
  } catch (error) {
    return { error: error instanceof PhotoUploadError ? error.message : "The photos could not be uploaded." };
  }

  try { await prisma.mediaAsset.createMany({ data: photos.map((photo) => ({ ...photo, appointmentId: id })) }); }
  catch (error) { await removePreparedPhotos(photos); throw error; }
  revalidatePath(`/appointments/${id}`);
  revalidatePath("/gallery");
  return { success: `${photos.length} ${photos.length === 1 ? "photo" : "photos"} added.`, resetKey: photos[0].imagePath };
}

export async function setAppointmentStatus(id: string, status: "CANCELLED" | "NO_SHOW" | "CONFIRMED") {
  const user = await requireBusinessPermission("appointments.manage");
  const appointment = await prisma.appointment.findFirst({ where: { id, deletedAt: null }, select: { status: true, startAt: true } });
  if (!appointment) throw new Error("Appointment not found.");
  if (status === "CONFIRMED" && appointment.status !== "SCHEDULED") throw new Error("Only scheduled appointments can be confirmed.");
  if (status === "CANCELLED" && !["SCHEDULED", "CONFIRMED"].includes(appointment.status)) throw new Error("Only upcoming appointments can be cancelled.");
  if (status === "NO_SHOW" && (!["SCHEDULED", "CONFIRMED"].includes(appointment.status) || appointment.startAt > new Date())) throw new Error("A future appointment cannot be marked as no-show.");
  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id }, data: { status } });
    await enqueueGoogleCalendarSync(tx, [id], "UPSERT");
  });
  revalidatePath(`/appointments/${id}`); revalidatePath("/appointments"); revalidatePath("/calendar"); revalidatePath("/report");
}

export async function setAppointmentPhotoFeatured(photoId: string, featured: boolean) {
  const user = await requireBusinessPermission("gallery.manage");
  const asset = await prisma.mediaAsset.findFirst({ where: { id: photoId, deletedAt: null, appointment: { deletedAt: null, status: "COMPLETED" } }, include: { variants: true } });
  if (!asset) throw new Error("Only photos from finalized appointments can be featured.");
  const source = asset.variants.find((variant) => variant.kind === "MEDIUM")?.objectKey || asset.variants.find((variant) => variant.kind === "LARGE")?.objectKey;
  const publicKey = `studio/featured/${asset.id}.webp`;
  if (source) {
    if (featured) await publishObject(source, publicKey);
    else await removeObject(publicKey, true).catch(() => undefined);
  }
  const result = await prisma.mediaAsset.updateMany({
    where: { id: photoId, deletedAt: null, appointment: { deletedAt: null, status: "COMPLETED" } },
    data: { featuredAt: featured ? new Date() : null },
  });
  if (!result.count) throw new Error("Only photos from finalized appointments can be featured.");
  revalidatePath("/gallery");
  revalidatePath("/");
}

export async function setAppointmentPhotoComparisonTag(photoId: string, comparisonTag: "UNTAGGED" | "BEFORE" | "AFTER") {
  const user = await requireBusinessPermission("gallery.manage");
  const photo = await prisma.mediaAsset.findFirst({ where: { id: photoId, deletedAt: null, appointment: { deletedAt: null, status: "COMPLETED" } }, select: { id: true, comparisonTag: true, appointmentId: true } });
  if (!photo) throw new Error("Photo not found.");
  await prisma.$transaction([
    prisma.mediaAsset.update({ where: { id: photoId }, data: { comparisonTag } }),
    prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, action: "gallery.photo_tagged", targetType: "MediaAsset", targetId: photoId, before: { comparisonTag: photo.comparisonTag }, after: { comparisonTag } } }),
  ]);
  revalidatePath(`/gallery/${photo.appointmentId}`);
}
