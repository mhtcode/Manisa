"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studioCategorySchema } from "@/lib/validation";

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 56) || "category";
}

async function uniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name);
  let slug = base;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const match = await prisma.studioCategory.findUnique({ where: { slug }, select: { id: true } });
    if (!match || match.id === excludeId) return slug;
    slug = `${base}-${suffix}`;
  }
  return `${base}-${Date.now()}`;
}

export async function createStudioCategory(formData: FormData) {
  await requireUser();
  const data = studioCategorySchema.parse(Object.fromEntries(formData));
  const aggregate = await prisma.studioCategory.aggregate({ _max: { position: true } });
  await prisma.studioCategory.create({ data: { ...data, slug: await uniqueSlug(data.name), position: (aggregate._max.position ?? -1) + 1 } });
  revalidatePath("/services");
  revalidatePath("/settings/categories");
  revalidatePath("/");
}

export async function updateStudioCategory(id: string, formData: FormData) {
  await requireUser();
  const data = studioCategorySchema.parse(Object.fromEntries(formData));
  await prisma.studioCategory.update({ where: { id }, data: { ...data, slug: await uniqueSlug(data.name, id) } });
  revalidatePath("/services");
  revalidatePath("/settings/categories");
  revalidatePath("/");
}

export async function toggleStudioCategory(id: string, active: boolean) {
  await requireUser();
  await prisma.studioCategory.update({ where: { id }, data: { active } });
  revalidatePath("/services");
  revalidatePath("/settings/categories");
  revalidatePath("/");
}

export async function moveStudioCategory(id: string, direction: "up" | "down") {
  await requireUser();
  const categories = await prisma.studioCategory.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, position: true } });
  const index = categories.findIndex((category) => category.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= categories.length) return;
  await prisma.$transaction([
    prisma.studioCategory.update({ where: { id: categories[index].id }, data: { position: categories[targetIndex].position } }),
    prisma.studioCategory.update({ where: { id: categories[targetIndex].id }, data: { position: categories[index].position } }),
  ]);
  revalidatePath("/services");
  revalidatePath("/settings/categories");
  revalidatePath("/");
}

export async function deleteStudioCategory(id: string) {
  await requireUser();
  const category = await prisma.studioCategory.findUnique({ where: { id }, select: { _count: { select: { services: true } } } });
  if (!category) return;
  if (category._count.services) throw new Error("Categories with services can be archived, but not deleted.");
  await prisma.studioCategory.delete({ where: { id } });
  revalidatePath("/settings/categories");
  revalidatePath("/");
}
