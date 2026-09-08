import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({ ownerType: z.enum(["CUSTOMER_AVATAR", "APPOINTMENT_PHOTO"]), customerId: z.string().optional(), appointmentId: z.string().optional(), fileName: z.string().min(1).max(240), contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]), sizeBytes: z.number().int().positive().max(20 * 1024 * 1024) });

export async function POST(request: Request) {
  const user = await requireBusinessPermission("gallery.manage");
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  const { ownerType, customerId, appointmentId, fileName, sizeBytes } = parsed.data;
  if ((ownerType === "CUSTOMER_AVATAR") !== Boolean(customerId) || (ownerType === "APPOINTMENT_PHOTO") !== Boolean(appointmentId)) return NextResponse.json({ error: "Invalid media owner" }, { status: 400 });
  const ownerValid = ownerType === "CUSTOMER_AVATAR" ? await prisma.customer.count({ where: { id: customerId, deletedAt: null } }) : await prisma.appointment.count({ where: { id: appointmentId, deletedAt: null } });
  if (!ownerValid) return NextResponse.json({ error: "Owner not found" }, { status: 404 });
  const assetId = randomUUID();
  const key = `studio/staging/${assetId}/original`;
  try {
    await prisma.$transaction(async (tx) => {
      const reserved = await tx.studioSettings.updateMany({ where: { id: "studio", storageUsedBytes: { lte: BigInt(Number.MAX_SAFE_INTEGER) } }, data: { storageReservedBytes: { increment: BigInt(sizeBytes) } } });
      if (!reserved.count) throw new Error("QUOTA");
      const studio = await tx.studioSettings.findUniqueOrThrow({ where: { id: "studio" }, select: { storageQuotaBytes: true, storageUsedBytes: true, storageReservedBytes: true } });
      if (studio.storageUsedBytes + studio.storageReservedBytes > studio.storageQuotaBytes) throw new Error("QUOTA");
      await tx.mediaAsset.create({ data: { id: assetId, ownerType, customerId, appointmentId, originalName: fileName, objectKey: key, width: 0, height: 0, sizeBytes, status: "STAGING" } });
    }, { isolationLevel: "Serializable" });
  } catch { return NextResponse.json({ error: "Storage quota exceeded" }, { status: 413 }); }
  return NextResponse.json({ assetId, uploadUrl: `/api/media/uploads/${assetId}/content`, expiresIn: 600 });
}
