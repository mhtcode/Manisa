"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActionNotifications } from "@/server/notifications";

export async function markNotificationRead(key: string) {
  const user = await requireUser();
  if (!/^(overdue|payment|confirm):[a-z0-9_-]{8,}$/i.test(key)) throw new Error("Invalid notification.");
  await prisma.notificationReceipt.upsert({
    where: { userId_key: { userId: user.id, key } },
    update: { readAt: new Date() },
    create: { userId: user.id, key },
  });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  const keys = (await getActionNotifications(user.id)).map((item) => item.key);
  if (keys.length) await prisma.notificationReceipt.createMany({ data: keys.map((key) => ({ userId: user.id, key })), skipDuplicates: true });
  revalidatePath("/", "layout");
}
