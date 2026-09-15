import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServerEnv, secureCookiesEnabled } from "@/lib/env";
import { getInstagramOAuthConfig } from "@/lib/instagram-config";
import { createInstagramOAuthState } from "@/lib/instagram-oauth-state";

const OAUTH_COOKIE = "manisa_instagram_oauth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const config = await getInstagramOAuthConfig();
  if (!config) return NextResponse.redirect(new URL("/settings/instagram?error=config", request.url));
  const env = getServerEnv();
  const created = createInstagramOAuthState(user.id, env.AUTH_SECRET);
  (await cookies()).set(OAUTH_COOKIE, created.nonce, { httpOnly: true, sameSite: "lax", secure: secureCookiesEnabled(), path: "/", maxAge: 10 * 60 });
  const authorize = new URL("https://www.instagram.com/oauth/authorize");
  authorize.searchParams.set("enable_fb_login", "0");
  authorize.searchParams.set("force_authentication", "1");
  authorize.searchParams.set("client_id", config.appId);
  authorize.searchParams.set("redirect_uri", config.redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "instagram_business_basic");
  authorize.searchParams.set("state", created.state);
  return NextResponse.redirect(authorize);
}
