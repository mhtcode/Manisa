import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireBusinessPermission } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { ensureGoogleCalendarCredential, getGoogleCalendarOAuthConfig } from "@/lib/google-calendar-config";
import { verifyGoogleCalendarOAuthState } from "@/lib/google-calendar-oauth-state";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/token-crypto";
import { parseBusinessDateTime, toDateTimeInput } from "@/lib/time";
import { enqueueGoogleCalendarSync } from "@/server/google-calendar";

const COOKIE = "manisa_google_calendar_oauth";

export async function GET(request: Request) {
  const target = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const user = await requireBusinessPermission("integrations.manage");
  const config = await getGoogleCalendarOAuthConfig();
  if (!config || !config.redirectUri.startsWith("https://")) return target("/settings/google-calendar?error=config");
  const url = new URL(request.url);
  const code = url.searchParams.get("code"); const state = url.searchParams.get("state"); const oauthError = url.searchParams.get("error");
  const store = await cookies(); const nonce = store.get(COOKIE)?.value; store.delete(COOKIE);
  const env = getServerEnv();
  const payload = state && nonce ? verifyGoogleCalendarOAuthState(state, nonce, env.AUTH_SECRET) : null;
  if (oauthError) return target("/settings/google-calendar?error=cancelled");
  if (!code || !payload || payload.userId !== user.id) return target("/settings/google-calendar?error=state");
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" }), cache: "no-store" });
    const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string; scope?: string };
    if (!tokenResponse.ok || !tokens.access_token || !tokens.refresh_token) return target("/settings/google-calendar?error=token");
    const scopes = tokens.scope?.split(" ") || [];
    if (!scopes.includes("https://www.googleapis.com/auth/calendar.events.owned") || !scopes.includes("https://www.googleapis.com/auth/calendar.calendarlist.readonly")) return target("/settings/google-calendar?error=scope");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
    const profile = await profileResponse.json() as { email?: string; email_verified?: boolean };
    if (!profileResponse.ok || !profile.email || profile.email_verified !== true) return target("/settings/google-calendar?error=account");
    await ensureGoogleCalendarCredential(user.id, config);
    const accountEmail = profile.email!.toLowerCase();
    const count = await prisma.$transaction(async (tx) => {
      const encryptedRefreshToken = encryptSecret(tokens.refresh_token!, env.INTEGRATION_ENCRYPTION_KEY!);
      const connection = await tx.googleCalendarConnection.upsert({ where: { googleAccountEmail_calendarId: { googleAccountEmail: accountEmail, calendarId: "primary" } }, create: { credentialId: "google-calendar", connectedById: user.id, googleAccountEmail: accountEmail, calendarId: "primary", calendarName: `${profile.email} · Primary`, primary: true, encryptedRefreshToken: encryptSecret(tokens.refresh_token!, env.INTEGRATION_ENCRYPTION_KEY!), grantedScopes: tokens.scope || scopes.join(" ") }, update: { connectedById: user.id, encryptedRefreshToken: encryptSecret(tokens.refresh_token!, env.INTEGRATION_ENCRYPTION_KEY!), grantedScopes: tokens.scope || scopes.join(" "), status: "CONNECTED", lastError: null } });
      await tx.googleCalendarConnection.updateMany({
        where: { googleAccountEmail: accountEmail },
        data: { credentialId: "google-calendar", connectedById: user.id, encryptedRefreshToken, grantedScopes: tokens.scope || scopes.join(" "), status: "CONNECTED", lastError: null },
      });
      const accountConnections = await tx.googleCalendarConnection.findMany({ where: { googleAccountEmail: accountEmail }, select: { id: true } });
      const connectionIds = accountConnections.map((item) => item.id);
      await tx.googleCalendarSyncJob.updateMany({ where: { connectionId: { in: connectionIds }, status: "FAILED" }, data: { status: "PENDING", attempts: 0, availableAt: new Date(), lockedAt: null, lastError: null } });
      const today = toDateTimeInput(new Date(), user.settings.timezone).slice(0, 10);
      const appointments = await tx.appointment.findMany({ where: { deletedAt: null, status: { in: ["SCHEDULED", "CONFIRMED"] }, startAt: { gte: parseBusinessDateTime(`${today}T00:00`, user.settings.timezone) } }, select: { id: true } });
      return enqueueGoogleCalendarSync(tx, appointments.map((item) => item.id), "UPSERT", connectionIds.length ? connectionIds : [connection.id]);
    });
    return target(`/settings/google-calendar?success=connected&queued=${count}`);
  } catch { return target("/settings/google-calendar?error=oauth"); }
}
