import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getCurrentUser } from "@/lib/auth";
import { readObject } from "@/lib/object-storage";
import { absoluteUploadPath } from "@/lib/photo-storage";
import { hasBusinessPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; variant: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, variant } = await params;
  const asset = await prisma.mediaAsset.findFirst({ where: { id, deletedAt: null, status: "READY" }, include: { variants: true } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const permission = asset.ownerType === "CUSTOMER_AVATAR" ? "customers.view" : "gallery.view";
  if (!hasBusinessPermission(user.role, user.permissionOverrides, permission)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const isDownload = variant.toLowerCase() === "download";
  const selected = isDownload
    ? asset.variants.find((item) => item.kind === "LARGE") || asset.variants.find((item) => item.kind === "MEDIUM") || asset.variants[0]
    : asset.variants.find((item) => item.kind.toLowerCase() === variant.toLowerCase()) || asset.variants[0];
  const key = selected?.objectKey || asset.objectKey;
  const legacyPath = isDownload ? asset.imagePath || asset.thumbnailPath : asset.thumbnailPath || asset.imagePath;
  const object = key ? await readObject(key).catch(() => null) : null;
  const bytes = object?.Body ? await object.Body.transformToByteArray() : legacyPath ? await readFile(absoluteUploadPath(legacyPath)).catch(() => null) : null;
  if (!bytes) return NextResponse.json({ error: "Photo unavailable" }, { status: 502 });
  const headers: Record<string, string> = { "Cache-Control": isDownload ? "private, no-store" : "private, max-age=300", "Content-Length": String(bytes.byteLength), "Content-Type": object?.ContentType || "image/webp", Vary: "Cookie" };
  if (isDownload) headers["Content-Disposition"] = `attachment; filename="manisa-photo-${asset.id}.webp"`;
  return new NextResponse(Buffer.from(bytes), { headers });
}
