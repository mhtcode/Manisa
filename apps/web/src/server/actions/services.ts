"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/lib/validation";

export async function createService(formData: FormData) {
  const user = await requireBusinessPermission("services.manage");
  const data = serviceSchema.parse(Object.fromEntries(formData));
  const category = await prisma.studioCategory.findFirst({ where: { id: data.categoryId, businessId: user.businessId, active: true, deletedAt: null }, select: { id: true } });
  if (!category) throw new Error("Choose an active service category.");
  await prisma.service.create({ data: { ...data, businessId: user.businessId } });
  revalidatePath("/services");
  redirect("/services");
}

export async function updateService(id: string, formData: FormData) {
  const user = await requireBusinessPermission("services.manage");
  const data = serviceSchema.parse(Object.fromEntries(formData));
  const category = await prisma.studioCategory.findFirst({ where: { id: data.categoryId, businessId: user.businessId, deletedAt: null }, select: { id: true } });
  if (!category) throw new Error("Choose a valid service category.");
  await prisma.service.update({ where: { id, businessId: user.businessId, deletedAt: null }, data });
  revalidatePath("/services");
  redirect("/services");
}

export async function toggleService(id: string, active: boolean) {
  const user = await requireBusinessPermission("services.manage");
  await prisma.service.update({ where: { id, businessId: user.businessId, deletedAt: null }, data: { active } });
  revalidatePath("/services");
}
