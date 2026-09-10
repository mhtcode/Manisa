import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp, { type OverlayOptions } from "sharp";
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

const allowedPositions = new Set(["northwest", "north", "northeast", "west", "centre", "east", "southwest", "south", "southeast"]);
function cropPosition(value: string | null) { return value && allowedPositions.has(value) ? value : "centre"; }
function boundedNumber(value: string | null, fallback: number, min: number, max: number) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback; }
function escapeXml(value: string) { return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[character] || character); }
function cleanText(value: string | null, fallback: string, limit: number) { return (value || fallback).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit) || fallback; }

function labelOverlay(regionWidth: number, regionHeight: number, regionLeft: number, regionTop: number, label: string, scale: number): OverlayOptions {
  const fontSize = Math.max(14, Math.round(Math.min(regionWidth, regionHeight) * 0.055));
  const margin = Math.max(9, Math.round(28 * scale));
  const estimatedWidth = Math.round(fontSize * (Array.from(label).length * 0.68 + 1.8));
  const boxWidth = Math.max(72 * scale, Math.min(regionWidth - margin * 2, estimatedWidth));
  const boxHeight = Math.max(28 * scale, Math.round(fontSize * 1.85));
  const safeLeft = Math.min(regionLeft + margin, regionLeft + regionWidth - Math.round(boxWidth) - margin);
  return {
    input: Buffer.from(`<svg width="${Math.round(boxWidth)}" height="${Math.round(boxHeight)}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="${Math.round(boxHeight / 2)}" fill="rgba(7,11,18,.78)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="DejaVu Sans,sans-serif" font-weight="700" font-size="${fontSize}">${escapeXml(label)}</text></svg>`),
    left: Math.max(regionLeft, Math.round(safeLeft)), top: regionTop + margin,
  };
}

function detailOverlay(width: number, height: number, text: string, scale: number): OverlayOptions {
  const fontSize = Math.max(14, Math.round(30 * scale));
  const overlayHeight = Math.round(82 * scale);
  return { input: Buffer.from(`<svg width="${width}" height="${overlayHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="rgba(7,11,18,.72)"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="DejaVu Sans,sans-serif" font-size="${fontSize}">${escapeXml(text)}</text></svg>`), left: 0, top: height - overlayHeight };
}

function logoCoordinates(position: string, width: number, height: number, logoWidth: number, logoHeight: number, margin: number) {
  if (position === "top-left") return { left: margin, top: margin };
  if (position === "top-right") return { left: width - logoWidth - margin, top: margin };
  if (position === "bottom-left") return { left: margin, top: height - logoHeight - margin };
  if (position === "center") return { left: Math.round((width - logoWidth) / 2), top: Math.round((height - logoHeight) / 2) };
  return { left: width - logoWidth - margin, top: height - logoHeight - margin };
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
  const [beforeInput, afterInput, logoInput, appointment, settings] = await Promise.all([
    photoBytes(before), photoBytes(afterPhoto), readFile(path.join(process.cwd(), "public", "brand", "manisa-logo.png")),
    prisma.appointment.findUnique({ where: { id: before.appointmentId }, select: { startAt: true } }),
    prisma.studioSettings.findUnique({ where: { id: "studio" }, select: { timezone: true } }),
  ]);
  if (!beforeInput || !afterInput) return NextResponse.json({ error: "One of the selected photos is unavailable." }, { status: 502 });

  const preview = query.get("preview") === "1";
  const format = query.get("format") === "story" ? "story" : query.get("format") === "portrait" ? "portrait" : "post";
  const layout = query.get("layout") === "stack" ? "stack" : "side";
  const scale = preview ? 0.5 : 1;
  const width = Math.round(1080 * scale);
  const height = Math.round((format === "story" ? 1920 : format === "portrait" ? 1350 : 1080) * scale);
  const share = boundedNumber(query.get("beforeShare"), 50, 25, 75) / 100;
  const beforeWidth = layout === "side" ? Math.round(width * share) : width;
  const beforeHeight = layout === "stack" ? Math.round(height * share) : height;
  const afterWidth = layout === "side" ? width - beforeWidth : width;
  const afterHeight = layout === "stack" ? height - beforeHeight : height;
  const [beforeImage, afterImage] = await Promise.all([
    sharp(beforeInput).rotate().resize({ width: beforeWidth, height: beforeHeight, fit: "cover", position: cropPosition(query.get("beforePosition")) }).jpeg({ quality: preview ? 80 : 92 }).toBuffer(),
    sharp(afterInput).rotate().resize({ width: afterWidth, height: afterHeight, fit: "cover", position: cropPosition(query.get("afterPosition")) }).jpeg({ quality: preview ? 80 : 92 }).toBuffer(),
  ]);
  const afterLeft = layout === "side" ? beforeWidth : 0;
  const afterTop = layout === "stack" ? beforeHeight : 0;
  const overlays: OverlayOptions[] = [{ input: beforeImage, left: 0, top: 0 }, { input: afterImage, left: afterLeft, top: afterTop }];

  const dividerWidth = Math.round(boundedNumber(query.get("dividerWidth"), 6, 0, 32) * scale);
  const dividerColor = /^#[0-9a-f]{6}$/i.test(query.get("dividerColor") || "") ? query.get("dividerColor")! : "#ffffff";
  if (dividerWidth > 0) overlays.push(layout === "side"
    ? { input: { create: { width: dividerWidth, height, channels: 4, background: dividerColor } }, left: Math.max(0, beforeWidth - Math.floor(dividerWidth / 2)), top: 0 }
    : { input: { create: { width, height: dividerWidth, channels: 4, background: dividerColor } }, left: 0, top: Math.max(0, beforeHeight - Math.floor(dividerWidth / 2)) });

  if (query.get("showLabels") !== "0") {
    const beforeLabel = cleanText(query.get("beforeLabel"), "BEFORE", 18);
    const afterLabel = cleanText(query.get("afterLabel"), "AFTER", 18);
    overlays.push(labelOverlay(beforeWidth, beforeHeight, 0, 0, beforeLabel, scale), labelOverlay(afterWidth, afterHeight, afterLeft, afterTop, afterLabel, scale));
  }

  const detailParts: string[] = [];
  const timezone = settings?.timezone || "America/Toronto";
  if (appointment && query.get("showDate") === "1") detailParts.push(new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone: timezone }).format(appointment.startAt));
  if (appointment && query.get("showTime") === "1") detailParts.push(new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(appointment.startAt));
  const caption = cleanText(query.get("caption"), "", 80);
  if (caption) detailParts.unshift(caption);
  if (detailParts.length) overlays.push(detailOverlay(width, height, detailParts.join("  ·  "), scale));

  const logoPosition = query.get("logoPosition") || "bottom-right";
  if (logoPosition !== "none") {
    const logoPercent = boundedNumber(query.get("logoSize"), 13, 6, 28);
    const logoWidth = Math.round(width * logoPercent / 100);
    const logo = await sharp(logoInput).resize({ width: logoWidth, withoutEnlargement: true }).png().toBuffer();
    const logoMeta = await sharp(logo).metadata();
    const margin = Math.round(width * 0.03);
    overlays.push({ input: logo, ...logoCoordinates(logoPosition, width, height, logoMeta.width || logoWidth, logoMeta.height || logoWidth, margin) });
  }

  const output = await sharp({ create: { width, height, channels: 3, background: "#111827" } }).composite(overlays).jpeg({ quality: preview ? 82 : 94, chromaSubsampling: "4:4:4" }).toBuffer();
  return new NextResponse(output, { headers: { "Cache-Control": "private, no-store", "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="manisa-before-after-${format}.jpg"`, "Content-Length": String(output.byteLength), "Content-Type": "image/jpeg" } });
}
