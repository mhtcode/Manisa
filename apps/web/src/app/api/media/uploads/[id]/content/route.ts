import { NextResponse } from "next/server";
import { requireBusinessPermission } from "@/lib/auth";
import { putObject } from "@/lib/object-storage";
import { prisma } from "@/lib/prisma";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);
const maxBytes = 20 * 1024 * 1024;

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireBusinessPermission("gallery.manage");
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].toLowerCase() || "";
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (!allowedTypes.has(contentType) || (declaredLength && declaredLength > maxBytes)) return NextResponse.json({ error: "Invalid photo" }, { status: 400 });
  const asset = await prisma.mediaAsset.findFirst({ where: { id: (await params).id, businessId: user.businessId, status: "STAGING" }, select: { objectKey: true, sizeBytes: true } });
  if (!asset?.objectKey) return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  const buffer = await request.arrayBuffer();
  if (!buffer.byteLength || buffer.byteLength > maxBytes || buffer.byteLength > Math.max(asset.sizeBytes, 1)) return NextResponse.json({ error: "Invalid photo size" }, { status: 400 });
  await putObject(asset.objectKey, new Uint8Array(buffer), contentType);
  return new NextResponse(null, { status: 204 });
}
