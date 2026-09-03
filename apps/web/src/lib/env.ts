import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().default("primary"),
  UPLOADS_DIR: z.string().min(1).optional(),
  INSTAGRAM_APP_ID: z.string().min(1).optional(),
  INSTAGRAM_APP_SECRET: z.string().min(1).optional(),
  INSTAGRAM_REDIRECT_URI: z.string().url().optional(),
  INTEGRATION_ENCRYPTION_KEY: z.string().min(32).optional(),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || undefined,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || undefined,
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
    UPLOADS_DIR: process.env.UPLOADS_DIR || undefined,
    INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID || undefined,
    INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET || undefined,
    INSTAGRAM_REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI || undefined,
    INTEGRATION_ENCRYPTION_KEY: process.env.INTEGRATION_ENCRYPTION_KEY || undefined,
  });
}

export function secureCookiesEnabled() {
  const configured = getServerEnv().SESSION_COOKIE_SECURE;
  return configured === undefined ? process.env.NODE_ENV === "production" : configured === "true";
}

export function googleCalendarConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function instagramConfigured() {
  const env = getServerEnv();
  return Boolean(env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET && env.INSTAGRAM_REDIRECT_URI?.startsWith("https://") && env.INTEGRATION_ENCRYPTION_KEY);
}
