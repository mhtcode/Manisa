"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { referralCreatesCycle } from "@/lib/referrals";
import { customerSchema } from "@/lib/validation";

async function validateReferrer(referrerId: string | undefined, customerId?: string) {
  if (!referrerId) return;
  if (referrerId === customerId) throw new Error("A customer cannot refer themselves.");
  const customers = await prisma.customer.findMany({ where: { deletedAt: null }, select: { id: true, referrerId: true } });
  const parentById = new Map(customers.map((customer) => [customer.id, customer.referrerId]));
  if (!parentById.has(referrerId)) throw new Error("The selected referring customer no longer exists.");
  if (!customerId) return;
  if (referralCreatesCycle(customerId, referrerId, parentById)) throw new Error("That referral would create a circular relationship.");
}

export async function createCustomer(formData: FormData) {
  await requireUser();
  const data = customerSchema.parse(Object.fromEntries(formData));
  await validateReferrer(data.referrerId);
  const customer = await prisma.customer.create({ data });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  await requireUser();
  const data = customerSchema.parse(Object.fromEntries(formData));
  await validateReferrer(data.referrerId, id);
  await prisma.customer.update({ where: { id, deletedAt: null }, data });
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}
