"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusinessPermission } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/token-crypto";
import { enqueueGoogleCalendarSync } from "@/server/google-calendar";

export async function retryGoogleCalendar() {
  const user = await requireBusinessPermission("integrations.manage");
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { businessId: user.businessId } });
  if (!connection) redirect("/settings/google-calendar?error=not-connected");
  if (connection.status === "PAUSED") redirect("/settings/google-calendar?error=reconnect");
  const failed = await prisma.googleCalendarSyncJob.findMany({ where: { businessId: user.businessId, status: "FAILED" }, select: { appointmentId: true, operation: true } });
  await prisma.$transaction(async (tx) => {
    for (const job of failed) await enqueueGoogleCalendarSync(tx, user.businessId, [job.appointmentId], job.operation);
    await tx.googleCalendarConnection.update({ where: { id: connection.id }, data: { lastError: null } });
  });
  revalidatePath("/settings/google-calendar");
  redirect(`/settings/google-calendar?success=retried&queued=${failed.length}`);
}

export async function disconnectGoogleCalendar() {
  const user = await requireBusinessPermission("integrations.manage");
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { businessId: user.businessId }, select: { id: true, encryptedRefreshToken: true } });
  if (!connection) redirect("/settings/google-calendar");
  const env = getServerEnv();
  if (env.INTEGRATION_ENCRYPTION_KEY) {
    try {
      const token = decryptSecret(connection.encryptedRefreshToken, env.INTEGRATION_ENCRYPTION_KEY);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, cache: "no-store" });
    } catch { /* Local disconnect must succeed even if Google is unavailable. */ }
  }
  await prisma.googleCalendarConnection.delete({ where: { id: connection.id } });
  revalidatePath("/settings/google-calendar");
  redirect("/settings/google-calendar?success=disconnected");
}
