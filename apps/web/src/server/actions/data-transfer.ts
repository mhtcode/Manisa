"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { requireBusinessPermission } from "@/lib/auth";
import { removeObject } from "@/lib/object-storage";
import { prisma } from "@/lib/prisma";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function requestBusinessExport(formData: FormData) {
  const user = await requireBusinessPermission("data.export");
  const fromValue = date.parse(formData.get("fromDate"));
  const toValue = date.parse(formData.get("toDate"));
  const fromDate = fromZonedTime(`${fromValue}T00:00:00`, user.settings.timezone);
  const toDate = fromZonedTime(`${toValue}T23:59:59.999`, user.settings.timezone);
  if (fromDate > toDate) throw new Error("The export start date must be before its end date.");
  const job = await prisma.$transaction(async (tx) => {
    const active = await tx.exportJob.count({ where: { businessId: user.businessId, status: { in: ["QUEUED", "PROCESSING"] } } });
    if (active) throw new Error("This business already has an export in progress.");
    return tx.exportJob.create({ data: { businessId: user.businessId, requestedById: user.id, fromDate, toDate } });
  }, { isolationLevel: "Serializable" });
  await prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, businessId: user.businessId, action: "data.export.create", targetType: "ExportJob", targetId: job.id, after: { fromDate, toDate } } });
  revalidatePath("/settings/data-transfer");
}

export async function retryBusinessExport(id: string) {
  const user = await requireBusinessPermission("data.export");
  await prisma.exportJob.updateMany({ where: { id, businessId: user.businessId, status: { in: ["FAILED", "EXPIRED"] } }, data: { status: "QUEUED", progress: 0, errorMessage: null, objectKey: null, expiresAt: null } });
  revalidatePath("/settings/data-transfer");
}

export async function deleteBusinessExport(id: string) {
  const user = await requireBusinessPermission("data.export");
  const job = await prisma.exportJob.findFirst({ where: { id, businessId: user.businessId, status: { not: "PROCESSING" } }, select: { objectKey: true } });
  if (!job) return;
  await prisma.exportJob.delete({ where: { id } });
  if (job.objectKey) await removeObject(job.objectKey).catch(() => undefined);
  revalidatePath("/settings/data-transfer");
}
