import Link from "next/link";
import { CustomerDirectory } from "@/components/customer-directory";
import { PageHeading } from "@/components/page-heading";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() || "";
  const now = new Date();
  const [customers, deliveredAppointments, actualServiceLines, historicalServiceLines] = await Promise.all([
    prisma.customer.findMany({ where: { active: true }, include: { _count: { select: { appointments: true } } }, orderBy: { updatedAt: "desc" }, take: 500 }),
    prisma.appointment.findMany({ where: { status: { in: ["COMPLETED", "HISTORICAL"] }, startAt: { lte: now } }, select: { customerId: true, startAt: true }, orderBy: { startAt: "desc" } }),
    prisma.appointmentActualService.findMany({ where: { appointment: { status: "COMPLETED", startAt: { lte: now } } }, select: { serviceNameSnapshot: true, appointment: { select: { id: true, customerId: true } } } }),
    prisma.appointmentService.findMany({ where: { appointment: { status: { in: ["COMPLETED", "HISTORICAL"] }, startAt: { lte: now } } }, select: { serviceNameSnapshot: true, appointment: { select: { id: true, customerId: true, status: true } } } }),
  ]);
  const latestVisits = new Map<string, Date>();
  deliveredAppointments.forEach((appointment) => { if (!latestVisits.has(appointment.customerId)) latestVisits.set(appointment.customerId, appointment.startAt); });
  const serviceCounts = new Map<string, Map<string, number>>();
  const appointmentsWithActuals = new Set(actualServiceLines.map((line) => line.appointment.id));
  [...actualServiceLines, ...historicalServiceLines.filter((line) => line.appointment.status === "HISTORICAL" || !appointmentsWithActuals.has(line.appointment.id))].forEach((line) => { const counts = serviceCounts.get(line.appointment.customerId) || new Map<string, number>(); counts.set(line.serviceNameSnapshot, (counts.get(line.serviceNameSnapshot) || 0) + 1); serviceCounts.set(line.appointment.customerId, counts); });
  return <><PageHeading title="Customers" description="Search profiles and open a complete relationship report." actions={<Link className="button" href="/customers/new">+ New customer</Link>}/><CustomerDirectory initialQuery={q} customers={customers.map((customer) => ({ id: customer.id, name: customerName(customer), phone: customer.phone, email: customer.email, language: customer.preferredLanguage, appointmentCount: customer._count.appointments, latestVisit: latestVisits.get(customer.id)?.toISOString() || null, popularService: [...(serviceCounts.get(customer.id) || new Map<string,number>())].sort((a,b) => b[1]-a[1])[0]?.[0] || null }))}/></>;
}
