import { readFile } from "node:fs/promises";
import { absoluteUploadPath } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { createReadUrl } from "@/lib/object-storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await prisma.mediaAsset.findFirst({ where: { id, deletedAt: null, featuredAt: { not: null }, appointment: { deletedAt: null, status: "COMPLETED", customer: { deletedAt: null } } }, select: { imagePath: true, thumbnailPath: true, variants: { where: { kind: { in: ["MEDIUM", "LARGE"] } }, orderBy: { width: "desc" }, select: { objectKey: true }, take: 1 } } });
  if (!photo) return new Response("Not found", { status: 404 });
  if (new URL(request.url).searchParams.get("view") === "full" && photo.variants[0]) return Response.redirect(await createReadUrl(photo.variants[0].objectKey), 307);
  if (photo.variants.length) return Response.redirect(await createReadUrl(`studio/featured/${id}.webp`, true), 307);
  const localPath = new URL(request.url).searchParams.get("view") === "full" ? photo.imagePath || photo.thumbnailPath : photo.thumbnailPath || photo.imagePath;
  if (!localPath) return new Response("Not found", { status: 404 });
  try {
    const image = await readFile(absoluteUploadPath(localPath));
    return new Response(image, { headers: { "Cache-Control": "public, max-age=0, must-revalidate", "Content-Length": String(image.byteLength), "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
