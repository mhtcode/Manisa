"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { appointmentsOverlap } from "@/lib/scheduling";
import { parseBusinessDateTime } from "@/lib/time";
import { prisma } from "@/lib/prisma";
import { getPublicBookingAvailability } from "@/server/public-booking";
import { enqueueGoogleCalendarSync } from "@/server/google-calendar";

export type PublicBookingResult = { success?: string; error?: string; appointmentId?: string } | null;

const schema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1).max(12),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(50),
  email: z.union([z.string().trim().toLowerCase().email(), z.literal("")]),
  notes: z.string().trim().max(1000),
  notificationPreference: z.enum(["NONE", "EMAIL", "SMS", "WHATSAPP"]),
  consent: z.boolean(),
});

export async function submitPublicBooking(_previous: PublicBookingResult, formData: FormData): Promise<PublicBookingResult> {
  if (String(formData.get("website") || "")) return { success: "Your appointment request was received." };
  const parsed = schema.safeParse({
    serviceIds: formData.getAll("serviceIds").map(String), date: formData.get("date"), time: formData.get("time"),
    name: formData.get("name"), phone: formData.get("phone"), email: formData.get("email") || "", notes: formData.get("notes") || "",
    notificationPreference: formData.get("notificationPreference") || "NONE", consent: formData.get("consent") === "on",
  });
  if (!parsed.success) return { error: "Review the required contact, service, date, and time fields." };
  const data = parsed.data;
  if (data.notificationPreference === "EMAIL" && !data.email) return { error: "Enter an email address or choose another contact preference." };
  if (data.notificationPreference !== "NONE" && !data.consent) return { error: "Please approve appointment updates for the selected contact method." };
  const availability = await getPublicBookingAvailability(data.date, data.serviceIds);
  if (!availability.available) return { error: availability.error };
  if (!availability.slots.includes(data.time)) return { error: "That time is no longer available. Choose another time." };
  const settings = await prisma.studioSettings.findUniqueOrThrow({ where: { id: "studio" } });
  const startAt = parseBusinessDateTime(`${data.date}T${data.time}`, settings.timezone);

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "Appointment" IN SHARE ROW EXCLUSIVE MODE');
      const candidates = await tx.appointment.findMany({ where: { deletedAt: null, status: { in: ["SCHEDULED", "CONFIRMED"] }, startAt: { gte: addDays(startAt, -1), lt: addDays(startAt, 1) } }, select: { startAt: true, expectedDurationMinutes: true } });
      if (candidates.some((item) => appointmentsOverlap(startAt, availability.durationMinutes, item.startAt, item.expectedDurationMinutes))) throw new Error("SLOT_TAKEN");
      const identities = [{ phone: data.phone }, ...(data.email ? [{ email: data.email }] : [])];
      let customer = await tx.customer.findFirst({ where: { deletedAt: null, OR: identities }, orderBy: { createdAt: "asc" } });
      if (customer) {
        const duplicate = await tx.appointment.count({ where: { customerId: customer.id, source: "PUBLIC_BOOKING", createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }, deletedAt: null } });
        if (duplicate) throw new Error("DUPLICATE_REQUEST");
      } else {
        customer = await tx.customer.create({ data: { firstName: data.name, displayName: data.name, phone: data.phone, email: data.email || null, preferredLanguage: "en" } });
      }
      const created = await tx.appointment.create({ data: {
        customerId: customer.id, serviceId: availability.services[0].id, serviceNameSnapshot: availability.services.map((service) => service.name).join(" + "),
        startAt, expectedDurationMinutes: availability.durationMinutes, expectedPrice: availability.totalPrice, currency: availability.currency, status: "SCHEDULED", source: "PUBLIC_BOOKING",
        notes: data.notes || null, notificationPreference: data.notificationPreference, notificationConsentAt: data.notificationPreference === "NONE" ? null : new Date(),
        notificationEmailSnapshot: data.email || null, notificationPhoneSnapshot: data.phone,
        serviceLines: { create: availability.services.map((service, position) => ({ serviceId: service.id, serviceNameSnapshot: service.name, durationMinutes: service.defaultDurationMinutes, price: service.defaultPrice, position })) },
      } });
      await tx.auditLog.create({ data: { actorSnapshot: "Public booking page", action: "appointment.public_requested", targetType: "Appointment", targetId: created.id, after: { source: "PUBLIC_BOOKING", notificationPreference: data.notificationPreference } } });
      await enqueueGoogleCalendarSync(tx, [created.id], "UPSERT");
      return created;
    }, { timeout: 15_000 });
    revalidatePath("/calendar"); revalidatePath("/appointments"); revalidatePath("/report");
    return { success: "Your appointment request is on the studio calendar. We will confirm it with you soon.", appointmentId: appointment.id };
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") return { error: "That time was just booked. Choose another available time." };
    if (error instanceof Error && error.message === "DUPLICATE_REQUEST") return { error: "We already received a recent request from you. Please wait for the studio to confirm it." };
    return { error: "Your request could not be saved. Please try again." };
  }
}
