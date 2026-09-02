import Link from "next/link";
import { CustomerDirectory } from "@/components/customer-directory";
import { PageHeading } from "@/components/page-heading";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() || "";
  const customers = await prisma.customer.findMany({ where: { active: true }, include: { _count: { select: { appointments: true } } }, orderBy: { updatedAt: "desc" }, take: 500 });
  return <><PageHeading title="Customers" description="Search instantly across names and contact details." actions={<Link className="button" href="/customers/new">+ New customer</Link>}/><CustomerDirectory initialQuery={q} customers={customers.map((customer) => ({ id: customer.id, name: customerName(customer), phone: customer.phone, email: customer.email, language: customer.preferredLanguage, appointmentCount: customer._count.appointments }))}/></>;
}
