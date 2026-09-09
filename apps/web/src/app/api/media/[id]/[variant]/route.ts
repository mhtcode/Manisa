import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readObject } from "@/lib/object-storage";
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
  const selected = asset.variants.find((item) => item.kind.toLowerCase() === variant.toLowerCase()) || asset.variants[0];
  const key = selected?.objectKey || asset.objectKey;
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const object = await readObject(key).catch(() => null);
  if (!object?.Body) return NextResponse.json({ error: "Photo unavailable" }, { status: 502 });
  const bytes = await object.Body.transformToByteArray();
  return new NextResponse(Buffer.from(bytes), { headers: { "Cache-Control": "private, max-age=300", "Content-Length": String(bytes.byteLength), "Content-Type": object.ContentType || "image/webp", Vary: "Cookie" } });
}
