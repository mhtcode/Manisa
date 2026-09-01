"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validation";

export async function createCustomer(formData: FormData) {
  await requireUser();
  const data = customerSchema.parse(Object.fromEntries(formData));
  const customer = await prisma.customer.create({ data });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  await requireUser();
  const data = customerSchema.parse(Object.fromEntries(formData));
  await prisma.customer.update({ where: { id }, data });
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function archiveCustomer(id: string) {
  await requireUser();
  await prisma.customer.update({ where: { id }, data: { active: false } });
  revalidatePath("/customers");
  redirect("/customers");
}
