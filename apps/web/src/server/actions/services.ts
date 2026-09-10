"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/lib/validation";

export async function createService(formData: FormData) {
  const user = await requireBusinessPermission("services.manage");
  const data = serviceSchema.parse(Object.fromEntries(formData));
  const category = await prisma.studioCategory.findFirst({ where: { id: data.categoryId, active: true, deletedAt: null }, select: { id: true } });
  if (!category) throw new Error("Choose an active service category.");
  const service = await prisma.service.create({ data: { ...data, } });
  revalidatePath("/services");
  return { success: "Service created.", redirectTo: `/services?created=${service.id}` };
}

export async function updateService(id: string, formData: FormData) {
  const user = await requireBusinessPermission("services.manage");
  const data = serviceSchema.parse(Object.fromEntries(formData));
  const category = await prisma.studioCategory.findFirst({ where: { id: data.categoryId, deletedAt: null }, select: { id: true } });
  if (!category) throw new Error("Choose a valid service category.");
  await prisma.service.update({ where: { id, deletedAt: null }, data });
  revalidatePath("/services");
  return { success: "Service updated.", redirectTo: "/services" };
}

export async function toggleService(id: string, active: boolean) {
  const user = await requireBusinessPermission("services.manage");
  await prisma.service.update({ where: { id, deletedAt: null }, data: { active } });
  revalidatePath("/services");
}
