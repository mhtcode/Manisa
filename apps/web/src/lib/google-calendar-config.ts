import { getServerEnv } from "./env";
import { prisma } from "./prisma";
import { decryptSecret, encryptSecret } from "./token-crypto";

export type GoogleCalendarOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  source: "database" | "environment";
};

export async function getGoogleCalendarOAuthConfig(): Promise<GoogleCalendarOAuthConfig | null> {
  const env = getServerEnv();
  const stored = await prisma.googleCalendarCredential.findUnique({ where: { id: "google-calendar" } });
  if (stored) {
    if (!env.INTEGRATION_ENCRYPTION_KEY) return null;
    return {
      clientId: stored.clientId,
      clientSecret: decryptSecret(stored.encryptedClientSecret, env.INTEGRATION_ENCRYPTION_KEY),
      redirectUri: stored.redirectUri,
      source: "database",
    };
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALENDAR_REDIRECT_URI || !env.INTEGRATION_ENCRYPTION_KEY) return null;
  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: env.GOOGLE_CALENDAR_REDIRECT_URI, source: "environment" };
}

export async function ensureGoogleCalendarCredential(configuredById: string, config: GoogleCalendarOAuthConfig) {
  const env = getServerEnv();
  if (!env.INTEGRATION_ENCRYPTION_KEY) throw new Error("Configure INTEGRATION_ENCRYPTION_KEY before saving Google credentials.");
  return prisma.googleCalendarCredential.upsert({
    where: { id: "google-calendar" },
    create: { id: "google-calendar", clientId: config.clientId, encryptedClientSecret: encryptSecret(config.clientSecret, env.INTEGRATION_ENCRYPTION_KEY), redirectUri: config.redirectUri, configuredById },
    update: {},
  });
}
