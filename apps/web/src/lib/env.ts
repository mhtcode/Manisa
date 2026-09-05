import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_AUTH_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().url().optional(),
  GOOGLE_CALENDAR_SYNC_SECRET: z.string().min(32).optional(),
  GOOGLE_AUTH_ALLOW_SIGNUP: z.enum(["true", "false"]).default("false"),
  GOOGLE_CALENDAR_ID: z.string().default("primary"),
  UPLOADS_DIR: z.string().min(1).optional(),
  INSTAGRAM_APP_ID: z.string().min(1).optional(),
  INSTAGRAM_APP_SECRET: z.string().min(1).optional(),
  INSTAGRAM_REDIRECT_URI: z.string().url().optional(),
  INTEGRATION_ENCRYPTION_KEY: z.string().min(32).optional(),
  TRASH_CLEANUP_SECRET: z.string().min(32).optional(),
  PLATFORM_SETUP_TOKEN: z.string().min(24).optional(),
  DEFAULT_STORAGE_QUOTA_BYTES: z.coerce.bigint().positive().default(BigInt(10 * 1024 * 1024 * 1024)),
  S3_ENDPOINT: z.string().url().optional(),
  S3_PUBLIC_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_PRIVATE_BUCKET: z.string().default("manisa-private"),
  S3_PUBLIC_BUCKET: z.string().default("manisa-public"),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || undefined,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || undefined,
    GOOGLE_AUTH_REDIRECT_URI: process.env.GOOGLE_AUTH_REDIRECT_URI || undefined,
    GOOGLE_CALENDAR_REDIRECT_URI: process.env.GOOGLE_CALENDAR_REDIRECT_URI || undefined,
    GOOGLE_CALENDAR_SYNC_SECRET: process.env.GOOGLE_CALENDAR_SYNC_SECRET || undefined,
    GOOGLE_AUTH_ALLOW_SIGNUP: process.env.GOOGLE_AUTH_ALLOW_SIGNUP || "false",
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
    UPLOADS_DIR: process.env.UPLOADS_DIR || undefined,
    INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID || undefined,
    INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET || undefined,
    INSTAGRAM_REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI || undefined,
    INTEGRATION_ENCRYPTION_KEY: process.env.INTEGRATION_ENCRYPTION_KEY || undefined,
    TRASH_CLEANUP_SECRET: process.env.TRASH_CLEANUP_SECRET || undefined,
    PLATFORM_SETUP_TOKEN: process.env.PLATFORM_SETUP_TOKEN || undefined,
    DEFAULT_STORAGE_QUOTA_BYTES: process.env.DEFAULT_STORAGE_QUOTA_BYTES,
    S3_ENDPOINT: process.env.S3_ENDPOINT || undefined,
    S3_PUBLIC_ENDPOINT: process.env.S3_PUBLIC_ENDPOINT || undefined,
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || undefined,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY || undefined,
    S3_PRIVATE_BUCKET: process.env.S3_PRIVATE_BUCKET,
    S3_PUBLIC_BUCKET: process.env.S3_PUBLIC_BUCKET,
  });
}

export function secureCookiesEnabled() {
  const configured = getServerEnv().SESSION_COOKIE_SECURE;
  return configured === undefined ? process.env.NODE_ENV === "production" : configured === "true";
}

export function googleCalendarConfigured() {
  const env = getServerEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALENDAR_REDIRECT_URI?.startsWith("https://") && env.INTEGRATION_ENCRYPTION_KEY);
}

export function googleAuthConfigured() {
  const env = getServerEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_AUTH_REDIRECT_URI);
}

export function instagramConfigured() {
  const env = getServerEnv();
  return Boolean(env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET && env.INSTAGRAM_REDIRECT_URI?.startsWith("https://") && env.INTEGRATION_ENCRYPTION_KEY);
}
