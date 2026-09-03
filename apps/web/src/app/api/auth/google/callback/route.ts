import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getServerEnv, googleAuthConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const STATE_COOKIE = "manisa_google_oauth_state";

function loginRedirect(request: NextRequest, error: string) {
  const response = NextResponse.redirect(new URL(`/login?google=${encodeURIComponent(error)}`, request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  if (!googleAuthConfigured()) return loginRedirect(request, "not-configured");
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  if (error) return loginRedirect(request, "cancelled");
  if (!code || !state || !expectedState || state !== expectedState) return loginRedirect(request, "invalid-state");

  try {
    const env = getServerEnv();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, redirect_uri: env.GOOGLE_AUTH_REDIRECT_URI!, grant_type: "authorization_code" }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) return loginRedirect(request, "token-exchange");
    const tokens = await tokenResponse.json() as { access_token?: string };
    if (!tokens.access_token) return loginRedirect(request, "token-exchange");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" });
    if (!profileResponse.ok) return loginRedirect(request, "profile");
    const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!profile.sub || !profile.email || profile.email_verified !== true) return loginRedirect(request, "unverified-email");
    const email = profile.email.trim().toLowerCase();
    let user = await prisma.user.findFirst({ where: { OR: [{ googleSubject: profile.sub }, { email }] } });
    if (user) {
      if (!user.active) return loginRedirect(request, "inactive");
      if (user.googleSubject && user.googleSubject !== profile.sub) return loginRedirect(request, "email-linked");
      if (!user.googleSubject) user = await prisma.user.update({ where: { id: user.id }, data: { googleSubject: profile.sub, name: profile.name?.trim() || user.name } });
    } else {
      if (env.GOOGLE_AUTH_ALLOW_SIGNUP !== "true") return loginRedirect(request, "signup-disabled");
      user = await prisma.user.create({ data: { email, name: profile.name?.trim() || email.split("@")[0], googleSubject: profile.sub, passwordHash: null } });
    }
    await createSession(user.id);
    const response = NextResponse.redirect(new URL("/report", request.url));
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch {
    return loginRedirect(request, "failed");
  }
}
