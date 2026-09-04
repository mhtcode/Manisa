import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServerEnv, instagramConfigured } from "@/lib/env";
import { verifyInstagramOAuthState } from "@/lib/instagram-oauth-state";
import { prisma } from "@/lib/prisma";
import { exchangeInstagramCode, syncInstagramConnection } from "@/server/instagram";

const OAUTH_COOKIE = "manisa_instagram_oauth";

export async function GET(request: Request) {
  const target = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const user = await getCurrentUser();
  if (!user?.businessId) return target("/login");
  if (!instagramConfigured()) return target("/settings/instagram?error=config");
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const nonce = cookieStore.get(OAUTH_COOKIE)?.value;
  cookieStore.delete(OAUTH_COOKIE);
  const payload = state && nonce ? verifyInstagramOAuthState(state, nonce, getServerEnv().AUTH_SECRET) : null;
  if (!code || !payload || payload.userId !== user.id) return target("/settings/instagram?error=state");

  try {
    const token = await exchangeInstagramCode(code);
    const connection = await prisma.instagramConnection.upsert({ where: { businessId: user.businessId }, create: { businessId: user.businessId, connectedById: user.id, ...token }, update: { ...token, connectedById: user.id, lastError: null } });
    try { await syncInstagramConnection(connection.id); } catch { /* The cached feed can be retried from Settings. */ }
    return target("/settings/instagram?success=connected");
  } catch {
    return target("/settings/instagram?error=oauth");
  }
}
