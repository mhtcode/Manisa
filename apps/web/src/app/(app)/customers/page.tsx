import Link from "next/link";
import { UserPlus } from "lucide-react";
import { CustomerDirectory } from "@/components/customer-directory";
import { PageHeading } from "@/components/page-heading";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { requireBusinessPermission } from "@/lib/auth";
import { customerName } from "@/lib/format";
import { collectionView } from "@/lib/preferences";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; from?: string }> }) {
  const [params, user] = await Promise.all([searchParams, requireBusinessPermission("customers.view")]);
  const q = params.q?.trim() || "";
  const view = collectionView(user.settings?.collectionViews, "customers", "list");
  const now = new Date();
  const [customers, deliveredAppointments] = await Promise.all([
    prisma.customer.findMany({ where: { active: true, deletedAt: null }, include: { profilePhotos: { where: { deletedAt: null, status: "READY" }, select: { id: true }, orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } }),
    prisma.appointment.findMany({ where: { deletedAt: null, status: { in: ["COMPLETED", "HISTORICAL"] }, startAt: { lte: now } }, select: { customerId: true, startAt: true }, orderBy: { startAt: "desc" } }),
  ]);
  const latestVisits = new Map<string, Date>();
  deliveredAppointments.forEach((appointment) => { if (!latestVisits.has(appointment.customerId)) latestVisits.set(appointment.customerId, appointment.startAt); });
  return <><PageHeading backHref={params.from === "settings" ? "/settings" : undefined} title="Customers" description="Search profiles and open a complete relationship report." actions={<><ViewModeToggle initialMode={view} page="customers"/><Link aria-label="New customer" className="icon-button" href="/customers/new" title="New customer"><UserPlus size={18}/></Link></>}/><CustomerDirectory initialQuery={q} mode={view} customers={customers.map((customer) => ({ id: customer.id, avatarId: customer.profilePhotos[0]?.id || null, name: customerName(customer), phone: customer.phone, latestVisit: latestVisits.get(customer.id)?.toISOString() || null }))}/></>;
}
