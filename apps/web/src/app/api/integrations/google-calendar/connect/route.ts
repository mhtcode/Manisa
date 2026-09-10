import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireBusinessPermission } from "@/lib/auth";
import { getServerEnv, secureCookiesEnabled } from "@/lib/env";
import { getGoogleCalendarOAuthConfig } from "@/lib/google-calendar-config";
import { createGoogleCalendarOAuthState } from "@/lib/google-calendar-oauth-state";

const COOKIE = "manisa_google_calendar_oauth";

export async function GET(request: Request) {
  const user = await requireBusinessPermission("integrations.manage");
  const config = await getGoogleCalendarOAuthConfig();
  if (!config || !config.redirectUri.startsWith("https://")) return NextResponse.redirect(new URL("/settings/google-calendar?error=config", request.url));
  const env = getServerEnv();
  const created = createGoogleCalendarOAuthState(user.id, env.AUTH_SECRET);
  (await cookies()).set(COOKIE, created.nonce, { httpOnly: true, sameSite: "lax", secure: secureCookiesEnabled(), path: "/", maxAge: 600 });
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", config.clientId);
  authorization.searchParams.set("redirect_uri", config.redirectUri);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "openid email https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/calendar.calendarlist.readonly");
  authorization.searchParams.set("state", created.state);
  authorization.searchParams.set("access_type", "offline");
  authorization.searchParams.set("prompt", "consent select_account");
  authorization.searchParams.set("include_granted_scopes", "false");
  return NextResponse.redirect(authorization);
}
