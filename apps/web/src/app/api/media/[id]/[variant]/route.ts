import { NextResponse } from "next/server";
import { requireBusinessPermission } from "@/lib/auth";
import { createReadUrl } from "@/lib/object-storage";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; variant: string }> }) {
  const user = await requireBusinessPermission("gallery.view");
  const { id, variant } = await params;
  const asset = await prisma.mediaAsset.findFirst({ where: { id, businessId: user.businessId, deletedAt: null, status: "READY" }, include: { variants: true } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const selected = asset.variants.find((item) => item.kind.toLowerCase() === variant.toLowerCase()) || asset.variants[0];
  const key = selected?.objectKey || asset.objectKey;
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.redirect(await createReadUrl(key), 307);
}
