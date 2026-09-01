import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import { PageHeading } from "@/components/page-heading";
import { prisma } from "@/lib/prisma";
import { updateCustomer } from "@/server/actions/customers";
export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const customer = await prisma.customer.findUnique({ where: { id } }); if (!customer) notFound(); return <><PageHeading title="Edit customer" description="Update contact details and preferences."/><CustomerForm customer={customer} action={updateCustomer.bind(null,id)}/></>; }
