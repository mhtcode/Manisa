import "server-only";
import { createHash } from "node:crypto";
import { access, mkdir } from "node:fs/promises";
import sharp from "sharp";
import { getServerEnv } from "@/lib/env";
import { instagramCoverUrl, type InstagramMedia } from "@/lib/instagram-media";
import { absoluteUploadPath } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/token-crypto";

const MEDIA_FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}";
const MAX_COVER_BYTES = 15 * 1024 * 1024;
const globalForInstagram = globalThis as unknown as { manisaInstagramSyncs?: Map<string, Promise<{ count: number; syncedAt: Date }>> };
const activeSyncs = globalForInstagram.manisaInstagramSyncs ?? new Map();
globalForInstagram.manisaInstagramSyncs = activeSyncs;

async function jsonResponse<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

async function downloadCover(remoteId: string, url: string) {
  const filename = `${createHash("sha256").update(remoteId).digest("hex").slice(0, 32)}.webp`;
  const relativePath = `instagram/${filename}`;
  await mkdir(absoluteUploadPath("instagram"), { recursive: true });
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Instagram cover download failed (${response.status}).`);
  const advertisedSize = Number(response.headers.get("content-length") || 0);
  if (advertisedSize > MAX_COVER_BYTES) throw new Error("Instagram cover is too large.");
  const input = Buffer.from(await response.arrayBuffer());
  if (!input.length || input.length > MAX_COVER_BYTES) throw new Error("Instagram cover is invalid or too large.");
  await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 1080, height: 1080, fit: "cover", position: "attention", withoutEnlargement: false })
    .webp({ quality: 78, effort: 4 })
    .toFile(absoluteUploadPath(relativePath));
  return relativePath;
}

async function refreshTokenIfNeeded(connection: { id: string; encryptedAccessToken: string; tokenExpiresAt: Date | null }) {
  const env = getServerEnv();
  if (!env.INTEGRATION_ENCRYPTION_KEY) throw new Error("Instagram encryption is not configured.");
  let token = decryptSecret(connection.encryptedAccessToken, env.INTEGRATION_ENCRYPTION_KEY);
  const refreshSoon = !connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60_000;
  if (!refreshSoon) return token;

  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  const refreshed = await jsonResponse<{ access_token: string; expires_in?: number }>(await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) }), "Instagram token refresh");
  token = refreshed.access_token;
  await prisma.instagramConnection.update({
    where: { id: connection.id },
    data: {
      encryptedAccessToken: encryptSecret(token, env.INTEGRATION_ENCRYPTION_KEY),
      tokenExpiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : connection.tokenExpiresAt,
    },
  });
  return token;
}

async function performInstagramSync(connectionId: string) {
  const connection = await prisma.instagramConnection.findUnique({ where: { id: connectionId } });
  if (!connection) throw new Error("Instagram is not connected.");

  try {
    const token = await refreshTokenIfNeeded(connection);
    const mediaUrl = new URL("https://graph.instagram.com/me/media");
    mediaUrl.searchParams.set("fields", MEDIA_FIELDS);
    mediaUrl.searchParams.set("limit", "12");
    mediaUrl.searchParams.set("access_token", token);
    const response = await jsonResponse<{ data?: InstagramMedia[] }>(await fetch(mediaUrl, { cache: "no-store", signal: AbortSignal.timeout(20_000) }), "Instagram media refresh");
    const media = (response.data || []).filter((item) => item.id && item.permalink && !Number.isNaN(new Date(item.timestamp).getTime()));
    const existing = new Map((await prisma.instagramPost.findMany({ where: { businessId: connection.businessId, remoteMediaId: { in: media.map((item) => item.id) } }, select: { remoteMediaId: true, cachedImagePath: true } })).map((post) => [post.remoteMediaId, post.cachedImagePath]));
    const cached: Array<{ item: InstagramMedia; cachedImagePath: string }> = [];
    for (const item of media) {
      const cover = instagramCoverUrl(item);
      if (!cover) continue;
      const existingPath = existing.get(item.id);
      if (existingPath) {
        try { await access(absoluteUploadPath(existingPath)); cached.push({ item, cachedImagePath: existingPath }); continue; }
        catch { /* Replace a missing cache file below. */ }
      }
      cached.push({ item, cachedImagePath: await downloadCover(item.id, cover) });
    }

    const syncedAt = new Date();
    await prisma.$transaction(async (transaction) => {
      const remoteIds = cached.map(({ item }) => item.id);
      await transaction.instagramPost.updateMany({ where: { connectionId, ...(remoteIds.length ? { remoteMediaId: { notIn: remoteIds } } : {}) }, data: { active: false } });
      for (const { item, cachedImagePath } of cached) {
        await transaction.instagramPost.upsert({
          where: { businessId_remoteMediaId: { businessId: connection.businessId, remoteMediaId: item.id } },
          create: { businessId: connection.businessId, connectionId, remoteMediaId: item.id, caption: item.caption?.slice(0, 2_200), mediaType: item.media_type, permalink: item.permalink, publishedAt: new Date(item.timestamp), cachedImagePath, syncedAt },
          update: { connectionId, caption: item.caption?.slice(0, 2_200), mediaType: item.media_type, permalink: item.permalink, publishedAt: new Date(item.timestamp), cachedImagePath, active: true, syncedAt },
        });
      }
      await transaction.instagramConnection.update({ where: { id: connectionId }, data: { lastSyncedAt: syncedAt, lastError: null } });
    });
    return { count: cached.length, syncedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 600) : "Instagram refresh failed.";
    await prisma.instagramConnection.updateMany({ where: { id: connectionId }, data: { lastError: message } });
    throw error;
  }
}

export function syncInstagramConnection(connectionId: string) {
  const running = activeSyncs.get(connectionId);
  if (running) return running;
  const sync = performInstagramSync(connectionId).finally(() => activeSyncs.delete(connectionId));
  activeSyncs.set(connectionId, sync);
  return sync;
}

export async function exchangeInstagramCode(code: string) {
  const env = getServerEnv();
  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET || !env.INSTAGRAM_REDIRECT_URI || !env.INTEGRATION_ENCRYPTION_KEY) throw new Error("Instagram is not configured.");
  const body = new URLSearchParams({ client_id: env.INSTAGRAM_APP_ID, client_secret: env.INSTAGRAM_APP_SECRET, grant_type: "authorization_code", redirect_uri: env.INSTAGRAM_REDIRECT_URI, code });
  const shortLived = await jsonResponse<{ access_token: string; user_id: number | string }>(await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(15_000) }), "Instagram authorization");
  const longUrl = new URL("https://graph.instagram.com/access_token");
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", env.INSTAGRAM_APP_SECRET);
  longUrl.searchParams.set("access_token", shortLived.access_token);
  const longLived = await jsonResponse<{ access_token: string; expires_in?: number }>(await fetch(longUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000) }), "Instagram long-lived token exchange");
  const profileUrl = new URL("https://graph.instagram.com/me");
  profileUrl.searchParams.set("fields", "id,user_id,username,account_type");
  profileUrl.searchParams.set("access_token", longLived.access_token);
  const profile = await jsonResponse<{ id?: string; user_id?: string; username?: string }>(await fetch(profileUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000) }), "Instagram profile request");
  return {
    instagramUserId: String(profile.user_id || profile.id || shortLived.user_id),
    username: profile.username || null,
    encryptedAccessToken: encryptSecret(longLived.access_token, env.INTEGRATION_ENCRYPTION_KEY),
    tokenExpiresAt: longLived.expires_in ? new Date(Date.now() + longLived.expires_in * 1000) : null,
  };
}
