import { NextResponse } from "next/server";
import { requireBusinessPermission } from "@/lib/auth";
import { readObject } from "@/lib/object-storage";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireBusinessPermission("data.export");
  const job = await prisma.exportJob.findFirst({ where: { id: (await params).id, businessId: user.businessId, status: "READY", expiresAt: { gt: new Date() } } });
  if (!job?.objectKey) return NextResponse.json({ error: "Export not available" }, { status: 404 });
  const object = await readObject(job.objectKey).catch(() => null);
  if (!object?.Body) return NextResponse.json({ error: "Export file unavailable" }, { status: 502 });
  const bytes = await object.Body.transformToByteArray();
  await prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, businessId: user.businessId, action: "data.export.download", targetType: "ExportJob", targetId: job.id } });
  return new NextResponse(Buffer.from(bytes), { headers: { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="manisa-export-${job.fromDate.toISOString().slice(0, 10)}-${job.toDate.toISOString().slice(0, 10)}.zip"`, "Content-Length": String(bytes.byteLength), "Content-Type": "application/zip", Vary: "Cookie" } });
}
