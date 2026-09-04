"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { referralCreatesCycle } from "@/lib/referrals";
import { customerSchema } from "@/lib/validation";

async function validateReferrer(businessId: string, referrerId: string | undefined, customerId?: string) {
  if (!referrerId) return;
  if (referrerId === customerId) throw new Error("A customer cannot refer themselves.");
  const customers = await prisma.customer.findMany({ where: { businessId, deletedAt: null }, select: { id: true, referrerId: true } });
  const parentById = new Map(customers.map((customer) => [customer.id, customer.referrerId]));
  if (!parentById.has(referrerId)) throw new Error("The selected referring customer no longer exists.");
  if (!customerId) return;
  if (referralCreatesCycle(customerId, referrerId, parentById)) throw new Error("That referral would create a circular relationship.");
}

export async function createCustomer(formData: FormData) {
  const user = await requireBusinessPermission("customers.manage");
  const data = customerSchema.parse(Object.fromEntries(formData));
  await validateReferrer(user.businessId, data.referrerId);
  const customer = await prisma.customer.create({ data: { ...data, businessId: user.businessId } });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  const user = await requireBusinessPermission("customers.manage");
  const data = customerSchema.parse(Object.fromEntries(formData));
  await validateReferrer(user.businessId, data.referrerId, id);
  await prisma.customer.update({ where: { id, businessId: user.businessId, deletedAt: null }, data });
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}
