"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { requireBusinessPermission } from "@/lib/auth";
import { bookingRequestConflicts, canReviewBookingRequest, normalizeBookingEmail, normalizeBookingPhone } from "@/lib/booking-requests";
import { prisma } from "@/lib/prisma";
import { enqueueGoogleCalendarSync } from "@/server/google-calendar";
import { enqueueNotification } from "@/server/notification-events";

export type BookingRequestReviewState = { error?: string; success?: string } | null;

export async function reviewBookingRequest(id: string, _previous: BookingRequestReviewState, formData: FormData): Promise<BookingRequestReviewState> {
  const user = await requireBusinessPermission("appointments.manage");
  const decision = formData.get("decision");
  if (decision !== "APPROVE" && decision !== "DECLINE") return { error: "Choose approve or decline." };

  try {
    const appointmentId = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "Appointment", "PublicBookingRequest" IN SHARE ROW EXCLUSIVE MODE');
      const request = await tx.publicBookingRequest.findUnique({ where: { id }, include: { services: { orderBy: { position: "asc" } } } });
      if (!request || !canReviewBookingRequest(request.status)) throw new Error("ALREADY_REVIEWED");
      if (decision === "DECLINE") {
        await tx.publicBookingRequest.update({ where: { id }, data: { status: "DECLINED", reviewedById: user.id, reviewedAt: new Date() } });
        await tx.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, action: "booking_request.declined", targetType: "PublicBookingRequest", targetId: id, before: { status: "PENDING" }, after: { status: "DECLINED" } } });
        return null;
      }

      const [appointments, otherRequests] = await Promise.all([
        tx.appointment.findMany({ where: { deletedAt: null, status: { in: ["REQUESTED", "SCHEDULED", "CONFIRMED"] }, startAt: { gte: addDays(request.requestedStartAt, -1), lt: addDays(request.requestedStartAt, 1) } }, select: { startAt: true, expectedDurationMinutes: true } }),
        tx.publicBookingRequest.findMany({ where: { id: { not: id }, status: "PENDING", requestedStartAt: { gte: addDays(request.requestedStartAt, -1), lt: addDays(request.requestedStartAt, 1) } }, select: { requestedStartAt: true, durationMinutes: true } }),
      ]);
      const occupied = [
        ...appointments.map((item) => ({ startAt: item.startAt, durationMinutes: item.expectedDurationMinutes })),
        ...otherRequests.map((item) => ({ startAt: item.requestedStartAt, durationMinutes: item.durationMinutes })),
      ];
      if (bookingRequestConflicts(request.requestedStartAt, request.durationMinutes, occupied)) throw new Error("SLOT_TAKEN");

      const activeCustomers = await tx.customer.findMany({ where: { deletedAt: null, active: true }, select: { id: true, phone: true, email: true } });
      const customer = activeCustomers.find((item) => (item.phone && normalizeBookingPhone(item.phone) === request.phone) || (request.email && item.email && normalizeBookingEmail(item.email) === request.email))
        ?? await tx.customer.create({ data: { firstName: request.customerName, displayName: request.customerName, phone: request.phone, email: request.email, preferredLanguage: request.locale } });
      const primary = request.services[0];
      if (!primary) throw new Error("NO_SERVICES");
      const appointment = await tx.appointment.create({ data: {
        customerId: customer.id,
        serviceId: primary.serviceId,
        serviceNameSnapshot: request.services.map((service) => service.serviceNameSnapshot).join(" + "),
        startAt: request.requestedStartAt,
        expectedDurationMinutes: request.durationMinutes,
        expectedPrice: request.totalPrice,
        currency: request.currency,
        status: "SCHEDULED",
        source: "PUBLIC_BOOKING",
        notes: request.notes,
        notificationPreference: request.notificationPreference,
        notificationConsentAt: request.notificationConsentAt,
        notificationEmailSnapshot: request.email,
        notificationPhoneSnapshot: request.phone,
        serviceLines: { create: request.services.map((service) => ({ serviceId: service.serviceId, serviceNameSnapshot: service.serviceNameSnapshot, durationMinutes: service.durationMinutes, price: service.price, position: service.position })) },
      } });
      await tx.publicBookingRequest.update({ where: { id }, data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date(), appointmentId: appointment.id } });
      await tx.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, action: "booking_request.approved", targetType: "PublicBookingRequest", targetId: id, before: { status: "PENDING" }, after: { status: "APPROVED", appointmentId: appointment.id } } });
      await enqueueGoogleCalendarSync(tx, [appointment.id], "UPSERT");
      await enqueueNotification(tx, { kind: "APPOINTMENT_CONFIRMATION", title: "Appointment scheduled", body: "An approved online request is ready for confirmation.", actionHref: `/appointments/${appointment.id}` });
      return appointment.id;
    }, { timeout: 15_000 });
    revalidatePath("/appointments");
    revalidatePath("/calendar");
    revalidatePath("/customers");
    return { success: appointmentId ? "Request approved and appointment scheduled." : "Request declined." };
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") return { error: "This time is no longer available. Decline the request or reschedule it after contacting the customer." };
    if (error instanceof Error && error.message === "ALREADY_REVIEWED") return { error: "This request was already reviewed." };
    return { error: "The request could not be reviewed. Please try again." };
  }
}
