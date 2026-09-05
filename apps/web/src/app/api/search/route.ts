import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasBusinessPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { customerName } from "@/lib/format";

type SearchResult = { id: string; type: string; title: string; subtitle: string; href: string };

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.businessId || !user.membership) return NextResponse.json({ results: [] }, { status: 401 });
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) || "";
  if (query.length < 2) return NextResponse.json({ results: [] });
  const can = (permission: Parameters<typeof hasBusinessPermission>[2]) => user.elevated || hasBusinessPermission(user.membership!.role, user.membership!.permissionOverrides, permission);
  const contains = { contains: query, mode: "insensitive" as const };
  const [customers, appointments, services, categories, methods] = await Promise.all([
    can("customers.view") ? prisma.customer.findMany({ where: { businessId: user.businessId, deletedAt: null, OR: [{ firstName: contains }, { lastName: contains }, { displayName: contains }, { phone: contains }, { email: contains }] }, orderBy: { updatedAt: "desc" }, take: 8 }) : [],
    can("appointments.view") ? prisma.appointment.findMany({ where: { businessId: user.businessId, deletedAt: null, OR: [{ serviceNameSnapshot: contains }, { customer: { OR: [{ firstName: contains }, { lastName: contains }, { displayName: contains }, { phone: contains }] } }] }, include: { customer: true }, orderBy: { startAt: "desc" }, take: 8 }) : [],
    can("services.view") ? prisma.service.findMany({ where: { businessId: user.businessId, deletedAt: null, OR: [{ name: contains }, { description: contains }] }, include: { category: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 8 }) : [],
    can("services.view") ? prisma.studioCategory.findMany({ where: { businessId: user.businessId, deletedAt: null, OR: [{ name: contains }, { description: contains }] }, orderBy: { position: "asc" }, take: 6 }) : [],
    can("financial.view") ? prisma.paymentMethod.findMany({ where: { businessId: user.businessId, deletedAt: null, name: contains }, orderBy: { position: "asc" }, take: 6 }) : [],
  ]);
  const results: SearchResult[] = [
    ...customers.map((item) => ({ id: item.id, type: "Customer", title: customerName(item), subtitle: item.phone || item.email || "Customer profile", href: `/customers/${item.id}` })),
    ...appointments.map((item) => ({ id: item.id, type: "Appointment", title: customerName(item.customer), subtitle: item.serviceNameSnapshot, href: `/appointments/${item.id}` })),
    ...services.map((item) => ({ id: item.id, type: "Service", title: item.name, subtitle: item.category.name, href: `/services/${item.id}/edit` })),
    ...categories.map((item) => ({ id: item.id, type: "Category", title: item.name, subtitle: "Service category", href: "/settings/categories" })),
    ...methods.map((item) => ({ id: item.id, type: "Payment method", title: item.name, subtitle: "Financial settings", href: "/settings/financial" })),
  ];
  return NextResponse.json({ results });
}
