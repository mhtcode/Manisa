import { getServerEnv } from "./env";
import { prisma } from "./prisma";
import { decryptSecret, encryptSecret } from "./token-crypto";

export type InstagramOAuthConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  source: "database" | "environment";
};

export async function getInstagramOAuthConfig(): Promise<InstagramOAuthConfig | null> {
  const env = getServerEnv();
  const stored = await prisma.instagramCredential.findUnique({ where: { id: "instagram" } });
  if (stored) {
    if (!env.INTEGRATION_ENCRYPTION_KEY) return null;
    return { appId: stored.appId, appSecret: decryptSecret(stored.encryptedAppSecret, env.INTEGRATION_ENCRYPTION_KEY), redirectUri: stored.redirectUri, source: "database" };
  }
  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET || !env.INSTAGRAM_REDIRECT_URI || !env.INTEGRATION_ENCRYPTION_KEY) return null;
  return { appId: env.INSTAGRAM_APP_ID, appSecret: env.INSTAGRAM_APP_SECRET, redirectUri: env.INSTAGRAM_REDIRECT_URI, source: "environment" };
}

export async function ensureInstagramCredential(configuredById: string, config: InstagramOAuthConfig) {
  const encryptionKey = getServerEnv().INTEGRATION_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error("Configure INTEGRATION_ENCRYPTION_KEY before saving Instagram credentials.");
  return prisma.instagramCredential.upsert({
    where: { id: "instagram" },
    create: { id: "instagram", appId: config.appId, encryptedAppSecret: encryptSecret(config.appSecret, encryptionKey), redirectUri: config.redirectUri, configuredById },
    update: {},
  });
}
