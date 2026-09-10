"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicReviewSchema, reviewLanguage } from "@/lib/reviews";

export type PublicReviewResult = { success?: string; error?: string };

export async function submitStudioReview(formData: FormData): Promise<PublicReviewResult> {
  if (String(formData.get("website") || "")) return { success: "Thank you. Your review was sent for approval." };
  const parsed = publicReviewSchema.safeParse({ reviewerName: formData.get("reviewerName"), rating: formData.get("rating"), opinion: formData.get("opinion") });
  if (!parsed.success) return { error: "Enter your name, choose 1–5 stars, and write at least 10 characters." };
  await prisma.studioReview.create({ data: { ...parsed.data, language: reviewLanguage(`${parsed.data.reviewerName} ${parsed.data.opinion}`) } });
  revalidatePath("/settings/reviews");
  return { success: "Thank you. Your review was sent for approval." };
}

async function moderateReview(id: string, status: "APPROVED" | "REJECTED") {
  const user = await requireBusinessPermission("business.manage");
  const review = await prisma.studioReview.findUnique({ where: { id } });
  if (!review || review.deletedAt) throw new Error("Review not found.");
  await prisma.$transaction([
    prisma.studioReview.update({ where: { id }, data: { status, approvedById: status === "APPROVED" ? user.id : null, approvedAt: status === "APPROVED" ? new Date() : null } }),
    prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, action: `review.${status.toLowerCase()}`, targetType: "StudioReview", targetId: id, before: { status: review.status }, after: { status } as Prisma.InputJsonValue } }),
  ]);
  revalidatePath("/");
  revalidatePath("/settings/reviews");
}

export async function approveStudioReview(id: string) { await moderateReview(id, "APPROVED"); }
export async function rejectStudioReview(id: string) { await moderateReview(id, "REJECTED"); }

export async function deleteStudioReview(id: string) {
  const user = await requireBusinessPermission("business.manage");
  const review = await prisma.studioReview.findFirst({ where: { id, deletedAt: null } });
  if (!review) return;
  await prisma.$transaction([
    prisma.studioReview.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, action: "review.deleted", targetType: "StudioReview", targetId: id, before: { status: review.status }, after: { deleted: true } } }),
  ]);
  revalidatePath("/");
  revalidatePath("/settings/reviews");
}

export async function restoreStudioReview(id: string) {
  const user = await requireBusinessPermission("business.manage");
  const review = await prisma.studioReview.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!review) return;
  await prisma.$transaction([
    prisma.studioReview.update({ where: { id }, data: { deletedAt: null } }),
    prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, action: "review.restored", targetType: "StudioReview", targetId: id, before: { deleted: true }, after: { status: review.status } } }),
  ]);
  revalidatePath("/");
  revalidatePath("/settings/reviews");
}
