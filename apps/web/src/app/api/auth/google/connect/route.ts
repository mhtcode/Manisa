import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerEnv, googleAuthConfigured, secureCookiesEnabled } from "@/lib/env";

const STATE_COOKIE = "manisa_google_oauth_state";
const INVITE_COOKIE = "manisa_google_invitation";

export async function GET(request: NextRequest) {
  if (!googleAuthConfigured()) return NextResponse.redirect(new URL("/login?google=not-configured", request.url));
  const env = getServerEnv();
  const state = randomBytes(32).toString("base64url");
  const invite = request.nextUrl.searchParams.get("invite");
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  authorization.searchParams.set("redirect_uri", env.GOOGLE_AUTH_REDIRECT_URI!);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "openid email profile");
  authorization.searchParams.set("state", state);
  authorization.searchParams.set("prompt", "select_account");
  const response = NextResponse.redirect(authorization);
  response.cookies.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: secureCookiesEnabled(), path: "/", maxAge: 600 });
  if (invite) response.cookies.set(INVITE_COOKIE, invite, { httpOnly: true, sameSite: "lax", secure: secureCookiesEnabled(), path: "/", maxAge: 600 });
  return response;
}
