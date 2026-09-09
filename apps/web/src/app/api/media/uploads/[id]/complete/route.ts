import { NextResponse } from "next/server";
import { requireBusinessPermission } from "@/lib/auth";
import { inspectObject, removeObject } from "@/lib/object-storage";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireBusinessPermission("gallery.view");
  const asset = await prisma.mediaAsset.findUnique({ where: { id: (await params).id }, select: { status: true, errorMessage: true } });
  if (!asset) return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  return NextResponse.json(asset, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireBusinessPermission("gallery.manage");
  const asset = await prisma.mediaAsset.findFirst({ where: { id: (await params).id, status: "STAGING" } });
  if (!asset?.objectKey) return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  const object = await inspectObject(asset.objectKey).catch(() => null);
  if (!object?.ContentLength || object.ContentLength > 20 * 1024 * 1024) {
    await prisma.$transaction([
      prisma.studioSettings.update({ where: { id: "studio" }, data: { storageReservedBytes: { decrement: BigInt(asset.sizeBytes) } } }),
      prisma.mediaAsset.update({ where: { id: asset.id }, data: { status: "FAILED", errorMessage: "Object is missing or invalid" } }),
    ]);
    await removeObject(asset.objectKey).catch(() => undefined);
    return NextResponse.json({ error: "Object is missing or invalid" }, { status: 400 });
  }
  try {
    await prisma.$transaction(async (tx) => {
      const actualSize = Number(object.ContentLength);
      const delta = actualSize - asset.sizeBytes;
      if (delta) await tx.studioSettings.update({ where: { id: "studio" }, data: { storageReservedBytes: { increment: BigInt(delta) } } });
      const studio = await tx.studioSettings.findUniqueOrThrow({ where: { id: "studio" }, select: { storageQuotaBytes: true, storageUsedBytes: true, storageReservedBytes: true } });
      if (studio.storageUsedBytes + studio.storageReservedBytes > studio.storageQuotaBytes) throw new Error("QUOTA");
      await tx.mediaAsset.update({ where: { id: asset.id }, data: { status: "PROCESSING", sizeBytes: actualSize, jobs: { create: {} } } });
    }, { isolationLevel: "Serializable" });
  } catch {
    await prisma.$transaction([
      prisma.studioSettings.update({ where: { id: "studio" }, data: { storageReservedBytes: { decrement: BigInt(asset.sizeBytes) } } }),
      prisma.mediaAsset.update({ where: { id: asset.id }, data: { status: "FAILED", errorMessage: "Storage quota exceeded" } }),
    ]);
    await removeObject(asset.objectKey).catch(() => undefined);
    return NextResponse.json({ error: "Storage quota exceeded" }, { status: 413 });
  }
  return NextResponse.json({ status: "PROCESSING" }, { status: 202 });
}
