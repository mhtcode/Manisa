import { PageHeading } from "@/components/page-heading";
import { ReferralNetwork } from "@/components/referral-network";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireBusinessPermission } from "@/lib/auth";

export default async function ReferralSettingsPage() {
  const user = await requireBusinessPermission("customers.view");
  const customers = await prisma.customer.findMany({ where: { deletedAt: null }, include: { profilePhotos: { where: { deletedAt: null, status: "READY" }, select: { id: true }, take: 1 } }, orderBy: [{ createdAt: "asc" }, { firstName: "asc" }] });
  return <><PageHeading backHref="/settings" title="Customer referrals"/><ReferralNetwork customers={customers.map((customer) => ({ id: customer.id, avatarId: customer.profilePhotos[0]?.id || null, name: customerName(customer), phone: customer.phone, email: customer.email, active: customer.active, referrerId: customer.referrerId }))}/></>;
}
