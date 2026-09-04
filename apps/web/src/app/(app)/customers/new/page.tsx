import { CustomerForm } from "@/components/customer-form";
import { PageHeading } from "@/components/page-heading";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireBusinessPermission } from "@/lib/auth";
import { createCustomer } from "@/server/actions/customers";
export default async function NewCustomerPage() { const user = await requireBusinessPermission("customers.manage"); const customers = await prisma.customer.findMany({ where: { businessId: user.businessId, active: true, deletedAt: null }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }); return <><PageHeading title="New customer" description="Add contact details, preferences, and an optional customer referral."/><CustomerForm action={createCustomer} referralOptions={customers.map((customer) => ({ id: customer.id, name: customerName(customer), phone: customer.phone, email: customer.email }))}/></>; }
