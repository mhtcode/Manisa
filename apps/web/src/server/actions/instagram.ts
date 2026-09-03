"use server";

import { unlink } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { absoluteUploadPath } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { syncInstagramConnection } from "@/server/instagram";

export async function refreshInstagram() {
  const user = await requireUser();
  const connection = await prisma.instagramConnection.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!connection) redirect("/settings/instagram?error=not-connected");
  try { await syncInstagramConnection(connection.id); }
  catch { redirect("/settings/instagram?error=refresh"); }
  revalidatePath("/");
  revalidatePath("/settings/instagram");
  redirect("/settings/instagram?success=refreshed");
}

export async function disconnectInstagram() {
  const user = await requireUser();
  const connection = await prisma.instagramConnection.findUnique({ where: { userId: user.id }, include: { posts: { select: { cachedImagePath: true } } } });
  if (!connection) redirect("/settings/instagram");
  await prisma.instagramConnection.delete({ where: { id: connection.id } });
  await Promise.all(connection.posts.map((post) => unlink(absoluteUploadPath(post.cachedImagePath)).catch(() => undefined)));
  revalidatePath("/");
  redirect("/settings/instagram?success=disconnected");
}
