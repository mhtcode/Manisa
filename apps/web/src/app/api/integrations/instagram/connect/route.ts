import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServerEnv, instagramConfigured, secureCookiesEnabled } from "@/lib/env";
import { createInstagramOAuthState } from "@/lib/instagram-oauth-state";

const OAUTH_COOKIE = "manisa_instagram_oauth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (!instagramConfigured()) return NextResponse.redirect(new URL("/settings/instagram?error=config", request.url));
  const env = getServerEnv();
  const created = createInstagramOAuthState(user.id, env.AUTH_SECRET);
  (await cookies()).set(OAUTH_COOKIE, created.nonce, { httpOnly: true, sameSite: "lax", secure: secureCookiesEnabled(), path: "/", maxAge: 10 * 60 });
  const authorize = new URL("https://www.instagram.com/oauth/authorize");
  authorize.searchParams.set("enable_fb_login", "0");
  authorize.searchParams.set("force_authentication", "1");
  authorize.searchParams.set("client_id", env.INSTAGRAM_APP_ID!);
  authorize.searchParams.set("redirect_uri", env.INSTAGRAM_REDIRECT_URI!);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "instagram_business_basic");
  authorize.searchParams.set("state", created.state);
  return NextResponse.redirect(authorize);
}
