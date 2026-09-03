import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import { PageHeading } from "@/components/page-heading";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { updateCustomer } from "@/server/actions/customers";
export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [customer, customers] = await Promise.all([prisma.customer.findUnique({ where: { id, deletedAt: null } }), prisma.customer.findMany({ where: { id: { not: id }, deletedAt: null, OR: [{ active: true }, { referrals: { some: { id } } }] }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] })]); if (!customer) notFound(); return <><PageHeading title="Edit customer" description="Update contact details, preferences, and referral source."/><CustomerForm customer={customer} action={updateCustomer.bind(null,id)} referralOptions={customers.map((item) => ({ id: item.id, name: customerName(item), phone: item.phone, email: item.email }))}/></>; }
