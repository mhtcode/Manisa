"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicReviewSchema, REVIEW_MAX_WORDS, REVIEW_MIN_WORDS, reviewLanguage } from "@/lib/reviews";
import { enqueueNotification } from "@/server/notification-events";

export type PublicReviewResult = { success?: string; error?: string };

export async function submitStudioReview(formData: FormData): Promise<PublicReviewResult> {
  if (String(formData.get("website") || "")) return { success: "Thank you. Your review was sent for approval." };
  const parsed = publicReviewSchema.safeParse({ reviewerName: formData.get("reviewerName"), rating: formData.get("rating"), opinion: formData.get("opinion") });
  if (!parsed.success) return { error: `Enter your name, choose at least one star, and write ${REVIEW_MIN_WORDS}–${REVIEW_MAX_WORDS} words.` };
  await prisma.$transaction(async (tx) => {
    await tx.studioReview.create({ data: { ...parsed.data, language: reviewLanguage(`${parsed.data.reviewerName} ${parsed.data.opinion}`) } });
    await enqueueNotification(tx, { kind: "REVIEW_SUBMITTED", title: "New customer review", body: "A new review is waiting for moderation.", actionHref: "/settings/reviews" });
  });
  revalidatePath("/settings/reviews");
  return { success: "Thank you. Your review was sent for approval." };
}

async function moderateReview(id: string, status: "APPROVED" | "REJECTED") {
  const user = await requireBusinessPermission("reviews.manage");
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
  const user = await requireBusinessPermission("reviews.manage");
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
  const user = await requireBusinessPermission("reviews.manage");
  const review = await prisma.studioReview.findFirst({ where: { id, deletedAt: { not: null } } });
  if (!review) return;
  await prisma.$transaction([
    prisma.studioReview.update({ where: { id }, data: { deletedAt: null } }),
    prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, action: "review.restored", targetType: "StudioReview", targetId: id, before: { deleted: true }, after: { status: review.status } } }),
  ]);
  revalidatePath("/");
  revalidatePath("/settings/reviews");
}
