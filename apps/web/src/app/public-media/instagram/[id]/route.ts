import { readFile } from "node:fs/promises";
import { absoluteUploadPath } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.instagramPost.findFirst({ where: { id, active: true }, select: { cachedImagePath: true } });
  if (!post) return new Response("Not found", { status: 404 });
  try {
    const image = await readFile(absoluteUploadPath(post.cachedImagePath));
    return new Response(image, { headers: { "Cache-Control": "public, max-age=900, stale-while-revalidate=86400", "Content-Length": String(image.byteLength), "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
