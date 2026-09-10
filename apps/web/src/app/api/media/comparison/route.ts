import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth";
import { readObject } from "@/lib/object-storage";
import { absoluteUploadPath } from "@/lib/photo-storage";
import { hasBusinessPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Photo = NonNullable<Awaited<ReturnType<typeof loadPhoto>>>;

async function loadPhoto(id: string) {
  return prisma.mediaAsset.findFirst({ where: { id, deletedAt: null, status: "READY", appointment: { deletedAt: null, status: "COMPLETED" } }, include: { variants: true } });
}

async function photoBytes(photo: Photo) {
  const key = photo.variants.find((item) => item.kind === "LARGE")?.objectKey || photo.variants.find((item) => item.kind === "MEDIUM")?.objectKey || photo.objectKey;
  if (key) {
    const object = await readObject(key).catch(() => null);
    if (object?.Body) return Buffer.from(await object.Body.transformToByteArray());
  }
  const legacyPath = photo.imagePath || photo.thumbnailPath;
  return legacyPath ? readFile(absoluteUploadPath(legacyPath)).catch(() => null) : null;
}

function position(value: string | null) {
  return value === "top" ? "north" : value === "bottom" ? "south" : "centre";
}

function labelOverlay(width: number, height: number, left: number, top: number, label: string) {
  const fontSize = Math.max(26, Math.round(Math.min(width, height) * 0.045));
  const boxWidth = Math.round(fontSize * (label.length * 0.72 + 1.7));
  const boxHeight = Math.round(fontSize * 1.75);
  return {
    input: Buffer.from(`<svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="${boxHeight / 2}" fill="rgba(12,18,29,.76)"/><text x="50%" y="57%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-weight="700" font-size="${fontSize}">${label}</text></svg>`),
    left,
    top,
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasBusinessPermission(user.role, user.permissionOverrides, "gallery.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const query = new URL(request.url).searchParams;
  const beforeId = query.get("beforeId") || "";
  const afterId = query.get("afterId") || "";
  if (!beforeId || !afterId || beforeId === afterId) return NextResponse.json({ error: "Choose two different photos." }, { status: 400 });
  const [before, afterPhoto] = await Promise.all([loadPhoto(beforeId), loadPhoto(afterId)]);
  if (!before || !afterPhoto || !before.appointmentId || before.appointmentId !== afterPhoto.appointmentId) return NextResponse.json({ error: "Choose photos from the same album." }, { status: 400 });
  const [beforeInput, afterInput, logoInput] = await Promise.all([
    photoBytes(before),
    photoBytes(afterPhoto),
    readFile(path.join(process.cwd(), "public", "brand", "manisa-logo.png")),
  ]);
  if (!beforeInput || !afterInput) return NextResponse.json({ error: "One of the selected photos is unavailable." }, { status: 502 });

  const format = query.get("format") === "story" ? "story" : "post";
  const layout = query.get("layout") === "stack" ? "stack" : "side";
  const width = 1080;
  const height = format === "story" ? 1920 : 1080;
  const share = Math.min(75, Math.max(25, Number(query.get("beforeShare")) || 50)) / 100;
  const beforeWidth = layout === "side" ? Math.round(width * share) : width;
  const beforeHeight = layout === "stack" ? Math.round(height * share) : height;
  const afterWidth = layout === "side" ? width - beforeWidth : width;
  const afterHeight = layout === "stack" ? height - beforeHeight : height;
  const [beforeImage, afterImage] = await Promise.all([
    sharp(beforeInput).rotate().resize({ width: beforeWidth, height: beforeHeight, fit: "cover", position: position(query.get("beforePosition")) }).jpeg({ quality: 91 }).toBuffer(),
    sharp(afterInput).rotate().resize({ width: afterWidth, height: afterHeight, fit: "cover", position: position(query.get("afterPosition")) }).jpeg({ quality: 91 }).toBuffer(),
  ]);
  const afterLeft = layout === "side" ? beforeWidth : 0;
  const afterTop = layout === "stack" ? beforeHeight : 0;
  const separator = layout === "side"
    ? { input: { create: { width: 5, height, channels: 4 as const, background: "rgba(255,255,255,.9)" } }, left: Math.max(0, beforeWidth - 2), top: 0 }
    : { input: { create: { width, height: 5, channels: 4 as const, background: "rgba(255,255,255,.9)" } }, left: 0, top: Math.max(0, beforeHeight - 2) };
  const labelMargin = Math.round(width * 0.035);
  const labels = layout === "side"
    ? [labelOverlay(beforeWidth, beforeHeight, labelMargin, labelMargin, "BEFORE"), labelOverlay(afterWidth, afterHeight, afterLeft + labelMargin, labelMargin, "AFTER")]
    : [labelOverlay(beforeWidth, beforeHeight, labelMargin, labelMargin, "BEFORE"), labelOverlay(afterWidth, afterHeight, labelMargin, afterTop + labelMargin, "AFTER")];
  const logoPercent = Math.min(24, Math.max(8, Number(query.get("logoSize")) || 13));
  const logoWidth = Math.round(width * logoPercent / 100);
  const logo = await sharp(logoInput).resize({ width: logoWidth, withoutEnlargement: true }).png().toBuffer();
  const logoMeta = await sharp(logo).metadata();
  const margin = Math.round(width * 0.035);
  const output = await sharp({ create: { width, height, channels: 3, background: "#111827" } }).composite([
    { input: beforeImage, left: 0, top: 0 },
    { input: afterImage, left: afterLeft, top: afterTop },
    separator,
    ...labels,
    { input: logo, left: width - (logoMeta.width || logoWidth) - margin, top: height - (logoMeta.height || logoWidth) - margin },
  ]).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer();
  return new NextResponse(output, { headers: { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="manisa-before-after-${format}.jpg"`, "Content-Length": String(output.byteLength), "Content-Type": "image/jpeg" } });
}
