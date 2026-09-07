import { requireBusinessPermission } from "@/lib/auth";
import { readObject } from "@/lib/object-storage";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireBusinessPermission("financial.view"), params]);
  const attachment = await prisma.financialAttachment.findFirst({ where: { id, businessId: user.businessId, deletedAt: null } });
  if (!attachment) return new Response("Not found", { status: 404 });
  const result = await readObject(attachment.objectKey);
  const body = new Uint8Array(await result.Body!.transformToByteArray());
  const filename = attachment.originalName.replace(/["\r\n]/g, "_");
  return new Response(body, { headers: { "Content-Type": attachment.mimeType, "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "private,no-store" } });
}
