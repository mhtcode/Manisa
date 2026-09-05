import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getServerEnv, googleAuthConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createHash } from "node:crypto";

const STATE_COOKIE = "manisa_google_oauth_state";
const INVITE_COOKIE = "manisa_google_invitation";

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
    const rawInvitation = request.cookies.get(INVITE_COOKIE)?.value;
    const invitation = rawInvitation ? await prisma.invitation.findUnique({ where: { tokenHash: createHash("sha256").update(rawInvitation).digest("hex") } }) : null;
    const validInvitation = invitation && invitation.email === email && !invitation.acceptedAt && !invitation.revokedAt && invitation.expiresAt > new Date() ? invitation : null;
    let user = await prisma.user.findFirst({ where: { OR: [{ googleSubject: profile.sub }, { email }] } });
    if (user) {
      if (!user.active) return loginRedirect(request, "inactive");
      if (user.googleSubject && user.googleSubject !== profile.sub) return loginRedirect(request, "email-linked");
      if (!user.googleSubject) user = await prisma.user.update({ where: { id: user.id }, data: { googleSubject: profile.sub, name: profile.name?.trim() || user.name } });
      if (validInvitation) await prisma.$transaction(async (tx) => {
        if (validInvitation.kind === "BUSINESS" && validInvitation.businessId && validInvitation.businessRole) await tx.businessMembership.upsert({ where: { userId_businessId: { userId: user!.id, businessId: validInvitation.businessId } }, update: { role: validInvitation.businessRole, permissionOverrides: validInvitation.permissionOverrides || {}, active: true, deletedAt: null }, create: { userId: user!.id, businessId: validInvitation.businessId, role: validInvitation.businessRole, permissionOverrides: validInvitation.permissionOverrides || {}, preferences: { create: {} } } });
        if (validInvitation.kind === "PLATFORM" && validInvitation.platformRole) await tx.platformAccess.upsert({ where: { userId: user!.id }, update: { role: validInvitation.platformRole, permissionOverrides: validInvitation.permissionOverrides || {}, active: true, deletedAt: null }, create: { userId: user!.id, role: validInvitation.platformRole, permissionOverrides: validInvitation.permissionOverrides || {} } });
        await tx.invitation.update({ where: { id: validInvitation.id }, data: { acceptedAt: new Date(), acceptedById: user!.id } });
      });
    } else {
      if (!validInvitation) return loginRedirect(request, "signup-disabled");
      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({ data: { email, name: profile.name?.trim() || email.split("@")[0], googleSubject: profile.sub, passwordHash: null, preferences: { create: {} } } });
        if (validInvitation.kind === "BUSINESS" && validInvitation.businessId && validInvitation.businessRole) await tx.businessMembership.create({ data: { userId: created.id, businessId: validInvitation.businessId, role: validInvitation.businessRole, permissionOverrides: validInvitation.permissionOverrides || {}, preferences: { create: {} } } });
        if (validInvitation.kind === "PLATFORM" && validInvitation.platformRole) await tx.platformAccess.create({ data: { userId: created.id, role: validInvitation.platformRole, permissionOverrides: validInvitation.permissionOverrides || {} } });
        await tx.invitation.update({ where: { id: validInvitation.id }, data: { acceptedAt: new Date(), acceptedById: created.id } });
        return created;
      });
    }
    const [memberships, platformAccess] = await Promise.all([
      prisma.businessMembership.findMany({ where: { userId: user.id, active: true, deletedAt: null, business: { active: true, deletedAt: null } }, select: { businessId: true }, take: 2 }),
      prisma.platformAccess.findFirst({ where: { userId: user.id, active: true, deletedAt: null }, select: { userId: true } }),
    ]);
    if (!memberships.length && !platformAccess) return loginRedirect(request, "inactive");
    await createSession(user.id, memberships.length === 1 ? memberships[0].businessId : undefined);
    const response = NextResponse.redirect(new URL(memberships.length === 1 ? "/report" : memberships.length > 1 ? "/workspaces" : "/platform", request.url));
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(INVITE_COOKIE);
    return response;
  } catch {
    return loginRedirect(request, "failed");
  }
}
