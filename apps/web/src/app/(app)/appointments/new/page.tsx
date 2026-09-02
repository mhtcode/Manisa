import { addHours } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { AppointmentForm } from "@/components/appointment-form";
import { PageHeading } from "@/components/page-heading";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createAppointment } from "@/server/actions/appointments";

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ customerId?: string; date?: string; time?: string }> }) {
  const [{ customerId, date, time }, customers, services] = await Promise.all([
    searchParams,
    prisma.customer.findMany({ where: { active: true }, orderBy: { firstName: "asc" } }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const nextHour = addHours(new Date(), 1);
  const nextBusinessHour = Number(formatInTimeZone(nextHour, "America/Toronto", "H"));
  const fallbackDate = formatInTimeZone(nextHour, "America/Toronto", "yyyy-MM-dd");
  const fallback = `${fallbackDate}T${nextBusinessHour >= 7 && nextBusinessHour <= 20 ? formatInTimeZone(nextHour, "America/Toronto", "HH:00") : "09:00"}`;
  const initialStartAt = /^\d{4}-\d{2}-\d{2}$/.test(date || "")
    ? `${date}T${/^\d{2}:\d{2}$/.test(time || "") ? time : "09:00"}`
    : fallback;

  return <><PageHeading title="New appointment" description="Stage 1: choose the customer, services, and an available time to create the visit estimate."/><AppointmentForm action={createAppointment} initialCustomerId={customerId} initialStartAt={initialStartAt} customers={customers.map((item) => ({ id: item.id, name: customerName(item), phone: item.phone, email: item.email }))} services={services.map((item) => ({ id: item.id, name: item.name, duration: item.defaultDurationMinutes, price: item.defaultPrice.toString(), currency: item.currency }))}/></>;
}
