import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().default("primary"),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || undefined,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || undefined,
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
  });
}

export function secureCookiesEnabled() {
  const configured = getServerEnv().SESSION_COOKIE_SECURE;
  return configured === undefined ? process.env.NODE_ENV === "production" : configured === "true";
}

export function googleCalendarConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
