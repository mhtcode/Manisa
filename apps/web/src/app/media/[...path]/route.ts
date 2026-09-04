import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadsRoot } from "@/lib/photo-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getCurrentUser();
  if (!user?.businessId) return new Response("Unauthorized", { status: 401 });
  const segments = (await params).path;
  if (!segments.length || segments.some((segment) => !/^[a-zA-Z0-9._-]+$/.test(segment)) || !segments.at(-1)?.endsWith(".webp")) {
    return new Response("Not found", { status: 404 });
  }

  const root = uploadsRoot();
  const storedPath = segments.join("/");
  const owned = await prisma.mediaAsset.count({ where: { businessId: user.businessId, deletedAt: null, OR: [{ imagePath: storedPath }, { thumbnailPath: storedPath }] } });
  if (!owned) return new Response("Not found", { status: 404 });
  const filePath = path.resolve(root, ...segments);
  if (!filePath.startsWith(`${root}${path.sep}`)) return new Response("Not found", { status: 404 });

  try {
    const image = await readFile(filePath);
    return new Response(image, { headers: {
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Length": String(image.byteLength),
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
