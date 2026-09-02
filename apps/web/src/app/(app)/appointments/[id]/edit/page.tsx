import { notFound } from "next/navigation";
import { AppointmentForm } from "@/components/appointment-form";
import { PageHeading } from "@/components/page-heading";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { toDateTimeInput } from "@/lib/time";
import { updateAppointment } from "@/server/actions/appointments";

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [appointment, customers, services] = await Promise.all([
    prisma.appointment.findUnique({ where: { id }, include: { serviceLines: { orderBy: { position: "asc" } } } }),
    prisma.customer.findMany({ where: { active: true }, orderBy: { firstName: "asc" } }),
    prisma.service.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
  ]);
  if (!appointment) notFound();
  return <><PageHeading title="Edit appointment estimate" description="Update the Stage 1 customer, service bundle, or schedule."/><AppointmentForm action={updateAppointment.bind(null, id)} appointment={{ id: appointment.id, customerId: appointment.customerId, serviceIds: appointment.serviceLines.length ? appointment.serviceLines.map((line) => line.serviceId) : [appointment.serviceId], serviceColors: Object.fromEntries(appointment.serviceLines.filter((line) => line.selectedColor).map((line) => [line.serviceId, line.selectedColor!])), startAt: toDateTimeInput(appointment.startAt), expectedDurationMinutes: appointment.expectedDurationMinutes, expectedPrice: appointment.expectedPrice.toString(), notes: appointment.notes }} customers={customers.map((item) => ({ id: item.id, name: customerName(item), phone: item.phone, email: item.email }))} services={services.map((item) => ({ id: item.id, name: item.name, duration: item.defaultDurationMinutes, price: item.defaultPrice.toString(), currency: item.currency, category: item.category, supportsColor: item.supportsColor }))}/></>;
}
