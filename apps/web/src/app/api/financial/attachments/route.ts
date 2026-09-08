import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireBusinessPermission } from "@/lib/auth";
import { putObject, removeObject } from "@/lib/object-storage";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 20 * 1024 * 1024;
const allowed = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function detectedMime(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  return "";
}

export async function POST(request: Request) {
  const user = await requireBusinessPermission("financial.manage");
  const data = await request.formData();
  const file = data.get("file");
  const ownerType = String(data.get("ownerType") || "");
  const ownerId = String(data.get("ownerId") || "");
  if (!(file instanceof File) || !file.size || file.size > MAX_BYTES || !["bill", "transaction"].includes(ownerType)) return NextResponse.json({ error: "Choose a JPEG, PNG, WebP, or PDF smaller than 20 MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectedMime(bytes);
  if (!allowed.has(mimeType)) return NextResponse.json({ error: "The file content is not an allowed image or PDF." }, { status: 400 });
  const owner = ownerType === "bill" ? await prisma.supplierBill.findFirst({ where: { id: ownerId, deletedAt: null }, select: { id: true } }) : await prisma.financialTransaction.findFirst({ where: { id: ownerId, deletedAt: null }, select: { id: true } });
  if (!owner) return NextResponse.json({ error: "Financial record not found." }, { status: 404 });
  const studio = await prisma.studioSettings.findUniqueOrThrow({ where: { id: "studio" }, select: { storageQuotaBytes: true, storageUsedBytes: true } });
  if (studio.storageUsedBytes + BigInt(file.size) > studio.storageQuotaBytes) return NextResponse.json({ error: "The studio storage quota is full." }, { status: 409 });
  const extension = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1];
  const objectKey = `studio/financial/${ownerType}/${ownerId}/${randomUUID()}.${extension}`;
  try {
    await putObject(objectKey, bytes, mimeType);
    const attachment = await prisma.$transaction(async (tx) => {
      const reserved = await tx.studioSettings.updateMany({ where: { id: "studio", storageUsedBytes: studio.storageUsedBytes }, data: { storageUsedBytes: { increment: BigInt(file.size) } } });
      if (!reserved.count) throw new Error("Storage changed while uploading. Try again.");
      return tx.financialAttachment.create({ data: { billId: ownerType === "bill" ? ownerId : null, transactionId: ownerType === "transaction" ? ownerId : null, originalName: file.name.slice(0, 240), mimeType, objectKey, sizeBytes: file.size } });
    });
    return NextResponse.json({ id: attachment.id, name: attachment.originalName });
  } catch (error) {
    await removeObject(objectKey).catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 409 });
  }
}
