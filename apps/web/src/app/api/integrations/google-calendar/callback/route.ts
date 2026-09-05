import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireBusinessPermission } from "@/lib/auth";
import { getServerEnv, googleCalendarConfigured } from "@/lib/env";
import { verifyGoogleCalendarOAuthState } from "@/lib/google-calendar-oauth-state";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/token-crypto";
import { parseBusinessDateTime, toDateTimeInput } from "@/lib/time";
import { enqueueGoogleCalendarSync } from "@/server/google-calendar";

const COOKIE = "manisa_google_calendar_oauth";

export async function GET(request: Request) {
  const target = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const user = await requireBusinessPermission("integrations.manage");
  if (!googleCalendarConfigured()) return target("/settings/google-calendar?error=config");
  const url = new URL(request.url);
  const code = url.searchParams.get("code"); const state = url.searchParams.get("state"); const oauthError = url.searchParams.get("error");
  const store = await cookies(); const nonce = store.get(COOKIE)?.value; store.delete(COOKIE);
  const env = getServerEnv();
  const payload = state && nonce ? verifyGoogleCalendarOAuthState(state, nonce, env.AUTH_SECRET) : null;
  if (oauthError) return target("/settings/google-calendar?error=cancelled");
  if (!code || !payload || payload.userId !== user.id || payload.businessId !== user.businessId) return target("/settings/google-calendar?error=state");
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, redirect_uri: env.GOOGLE_CALENDAR_REDIRECT_URI!, grant_type: "authorization_code" }), cache: "no-store" });
    const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; scope?: string };
    if (!tokenResponse.ok || !tokens.access_token || !tokens.refresh_token) return target("/settings/google-calendar?error=token");
    if (!tokens.scope?.split(" ").includes("https://www.googleapis.com/auth/calendar.events.owned")) return target("/settings/google-calendar?error=scope");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
    const profile = await profileResponse.json() as { email?: string; email_verified?: boolean };
    if (!profileResponse.ok || !profile.email || profile.email_verified !== true) return target("/settings/google-calendar?error=account");
    const count = await prisma.$transaction(async (tx) => {
      await tx.googleCalendarConnection.upsert({ where: { businessId: user.businessId }, create: { businessId: user.businessId, connectedById: user.id, googleAccountEmail: profile.email!.toLowerCase(), encryptedRefreshToken: encryptSecret(tokens.refresh_token!, env.INTEGRATION_ENCRYPTION_KEY!), grantedScopes: tokens.scope || "https://www.googleapis.com/auth/calendar.events.owned" }, update: { connectedById: user.id, googleAccountEmail: profile.email!.toLowerCase(), encryptedRefreshToken: encryptSecret(tokens.refresh_token!, env.INTEGRATION_ENCRYPTION_KEY!), grantedScopes: tokens.scope || "https://www.googleapis.com/auth/calendar.events.owned", status: "CONNECTED", lastError: null } });
      await tx.googleCalendarSyncJob.updateMany({ where: { businessId: user.businessId, status: "FAILED" }, data: { status: "PENDING", attempts: 0, availableAt: new Date(), lockedAt: null, lastError: null } });
      const today = toDateTimeInput(new Date(), user.settings.timezone).slice(0, 10);
      const appointments = await tx.appointment.findMany({ where: { businessId: user.businessId, deletedAt: null, status: { in: ["SCHEDULED", "CONFIRMED"] }, startAt: { gte: parseBusinessDateTime(`${today}T00:00`, user.settings.timezone) } }, select: { id: true } });
      await enqueueGoogleCalendarSync(tx, user.businessId, appointments.map((item) => item.id), "UPSERT");
      return appointments.length;
    });
    return target(`/settings/google-calendar?success=connected&queued=${count}`);
  } catch { return target("/settings/google-calendar?error=oauth"); }
}
