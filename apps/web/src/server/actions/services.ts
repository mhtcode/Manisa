"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/lib/validation";

export async function createService(formData: FormData) {
  await requireUser();
  const data = serviceSchema.parse(Object.fromEntries(formData));
  const category = await prisma.studioCategory.findFirst({ where: { id: data.categoryId, active: true }, select: { id: true } });
  if (!category) throw new Error("Choose an active service category.");
  await prisma.service.create({ data });
  revalidatePath("/services");
  redirect("/services");
}

export async function updateService(id: string, formData: FormData) {
  await requireUser();
  const data = serviceSchema.parse(Object.fromEntries(formData));
  const category = await prisma.studioCategory.findUnique({ where: { id: data.categoryId }, select: { id: true } });
  if (!category) throw new Error("Choose a valid service category.");
  await prisma.service.update({ where: { id }, data });
  revalidatePath("/services");
  redirect("/services");
}

export async function toggleService(id: string, active: boolean) {
  await requireUser();
  await prisma.service.update({ where: { id }, data: { active } });
  revalidatePath("/services");
}
