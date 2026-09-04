import { notFound } from "next/navigation";
import { AppointmentForm } from "@/components/appointment-form";
import { PageHeading } from "@/components/page-heading";
import { customerName } from "@/lib/format";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toDateTimeInput } from "@/lib/time";
import { updateAppointment } from "@/server/actions/appointments";

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireBusinessPermission("appointments.manage");
  const [appointment, customers, services] = await Promise.all([
    prisma.appointment.findUnique({ where: { id, businessId: user.businessId, deletedAt: null }, include: { serviceLines: { orderBy: { position: "asc" } } } }),
    prisma.customer.findMany({ where: { businessId: user.businessId, active: true, deletedAt: null }, orderBy: { firstName: "asc" } }),
    prisma.service.findMany({ where: { businessId: user.businessId, deletedAt: null, category: { deletedAt: null } }, include: { category: true }, orderBy: [{ category: { position: "asc" } }, { active: "desc" }, { name: "asc" }] }),
  ]);
  if (!appointment) notFound();
  const savedLines = appointment.serviceLines.flatMap((line) => line.serviceId ? [{ ...line, serviceId: line.serviceId }] : []);
  const serviceIds = savedLines.length ? savedLines.map((line) => line.serviceId) : appointment.serviceId ? [appointment.serviceId] : [];
  const serviceColors = Object.fromEntries(savedLines.filter((line) => line.selectedColor).map((line) => [line.serviceId, line.selectedColor!]));
  return <><PageHeading title="Edit appointment estimate" description="Update the Stage 1 customer, service bundle, or schedule."/><AppointmentForm action={updateAppointment.bind(null, id)} appointment={{ id: appointment.id, customerId: appointment.customerId, serviceIds, serviceColors, startAt: toDateTimeInput(appointment.startAt), expectedDurationMinutes: appointment.expectedDurationMinutes, expectedPrice: appointment.expectedPrice.toString(), notes: appointment.notes }} customers={customers.map((item) => ({ id: item.id, name: customerName(item), phone: item.phone, email: item.email }))} services={services.map((item) => ({ id: item.id, name: item.name, duration: item.defaultDurationMinutes, price: item.defaultPrice.toString(), currency: item.currency, category: { id: item.category.id, name: item.category.name, description: item.category.description, icon: item.category.icon, accentColor: item.category.accentColor }, supportsColor: item.supportsColor }))}/></>;
}
