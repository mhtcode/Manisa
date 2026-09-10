"use server";

import { unlink } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { requireBusinessPermission } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { absoluteUploadPath } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/token-crypto";
import { syncInstagramConnection } from "@/server/instagram";

export type InstagramCredentialResult = { error?: string; success?: string };

export async function saveInstagramCredentials(_previous: InstagramCredentialResult, formData: FormData): Promise<InstagramCredentialResult> {
  const user = await requireBusinessPermission("integrations.manage");
  const appId = String(formData.get("appId") || "").trim();
  const appSecret = String(formData.get("appSecret") || "").trim();
  const redirectUri = String(formData.get("redirectUri") || "").trim();
  const existing = await prisma.instagramCredential.findUnique({ where: { id: "instagram" } });
  if (appId.length < 5) return { error: "Enter the Instagram app ID from Meta." };
  if (!appSecret && !existing) return { error: "Enter the Instagram app secret." };
  let callback: URL;
  try { callback = new URL(redirectUri); } catch { return { error: "Enter a valid public HTTPS callback URL." }; }
  if (callback.protocol !== "https:" || callback.pathname !== "/api/integrations/instagram/callback") return { error: "The callback must be HTTPS and end with /api/integrations/instagram/callback." };
  const encryptionKey = getServerEnv().INTEGRATION_ENCRYPTION_KEY;
  if (!encryptionKey) return { error: "The server owner must configure INTEGRATION_ENCRYPTION_KEY once before credentials can be stored." };
  const encryptedAppSecret = appSecret ? encryptSecret(appSecret, encryptionKey) : existing!.encryptedAppSecret;
  const changed = Boolean(existing && (existing.appId !== appId || existing.redirectUri !== redirectUri || appSecret));
  await prisma.$transaction([
    prisma.instagramCredential.upsert({ where: { id: "instagram" }, create: { id: "instagram", appId, encryptedAppSecret, redirectUri, configuredById: user.id }, update: { appId, encryptedAppSecret, redirectUri, configuredById: user.id } }),
    prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, action: existing ? "instagram.credentials_updated" : "instagram.credentials_created", targetType: "InstagramCredential", targetId: "instagram", before: existing ? { appId: existing.appId, redirectUri: existing.redirectUri } : undefined, after: { appId, redirectUri } } }),
  ]);
  if (changed) await prisma.instagramConnection.updateMany({ data: { lastError: "OAuth credentials changed. Reconnect the Instagram account if refresh fails." } });
  revalidatePath("/settings/instagram");
  return { success: changed ? "Credentials saved. Reconnect if Instagram asks for authorization again." : "Instagram credentials saved securely." };
}

export async function refreshInstagram() {
  const user = await requireUser();
  const connection = await prisma.instagramConnection.findUnique({ where: { singletonKey: 1 }, select: { id: true } });
  if (!connection) redirect("/settings/instagram?error=not-connected");
  try { await syncInstagramConnection(connection.id); }
  catch { redirect("/settings/instagram?error=refresh"); }
  revalidatePath("/");
  revalidatePath("/settings/instagram");
  redirect("/settings/instagram?success=refreshed");
}

export async function disconnectInstagram() {
  const user = await requireUser();
  const connection = await prisma.instagramConnection.findUnique({ where: { singletonKey: 1 }, include: { posts: { select: { cachedImagePath: true } } } });
  if (!connection) redirect("/settings/instagram");
  await prisma.instagramConnection.delete({ where: { id: connection.id } });
  await Promise.all(connection.posts.map((post) => unlink(absoluteUploadPath(post.cachedImagePath)).catch(() => undefined)));
  revalidatePath("/");
  redirect("/settings/instagram?success=disconnected");
}
