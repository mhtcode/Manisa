import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireBusinessPermission } from "@/lib/auth";
import { getServerEnv, googleCalendarConfigured, secureCookiesEnabled } from "@/lib/env";
import { createGoogleCalendarOAuthState } from "@/lib/google-calendar-oauth-state";

const COOKIE = "manisa_google_calendar_oauth";

export async function GET(request: Request) {
  const user = await requireBusinessPermission("integrations.manage");
  if (!googleCalendarConfigured()) return NextResponse.redirect(new URL("/settings/google-calendar?error=config", request.url));
  const env = getServerEnv();
  const created = createGoogleCalendarOAuthState(user.id, user.businessId, env.AUTH_SECRET);
  (await cookies()).set(COOKIE, created.nonce, { httpOnly: true, sameSite: "lax", secure: secureCookiesEnabled(), path: "/", maxAge: 600 });
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  authorization.searchParams.set("redirect_uri", env.GOOGLE_CALENDAR_REDIRECT_URI!);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "openid email https://www.googleapis.com/auth/calendar.events.owned");
  authorization.searchParams.set("state", created.state);
  authorization.searchParams.set("access_type", "offline");
  authorization.searchParams.set("prompt", "consent select_account");
  authorization.searchParams.set("include_granted_scopes", "false");
  return NextResponse.redirect(authorization);
}
