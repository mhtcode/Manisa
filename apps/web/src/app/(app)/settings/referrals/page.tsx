import { PageHeading } from "@/components/page-heading";
import { ReferralNetwork } from "@/components/referral-network";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireBusinessPermission } from "@/lib/auth";

export default async function ReferralSettingsPage() {
  const user = await requireBusinessPermission("customers.view");
  const customers = await prisma.customer.findMany({ where: { businessId: user.businessId, deletedAt: null }, orderBy: [{ createdAt: "asc" }, { firstName: "asc" }] });
  return <><PageHeading backHref="/settings" title="Customer referrals" description="Explore who introduced each customer and filter the complete referral network."/><ReferralNetwork customers={customers.map((customer) => ({ id: customer.id, name: customerName(customer), phone: customer.phone, email: customer.email, active: customer.active, referrerId: customer.referrerId }))}/></>;
}
