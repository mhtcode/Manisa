import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { getServerEnv, secureCookiesEnabled } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { hasBusinessPermission, hasPlatformPermission, type BusinessPermission, type PlatformPermission } from "@/lib/permissions";

const COOKIE_NAME = "manisa_session";
const SESSION_DURATION = 60 * 60 * 12;

function secret() { return new TextEncoder().encode(getServerEnv().AUTH_SECRET); }

export type SessionPayload = { userId: string; businessId?: string; elevated?: boolean };

export async function sessionPayload(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return typeof payload.userId === "string" ? {
      userId: payload.userId,
      businessId: typeof payload.businessId === "string" ? payload.businessId : undefined,
      elevated: payload.elevated === true,
    } : null;
  } catch { return null; }
}

export async function createSession(userId: string, businessId?: string, elevated = false) {
  const token = await new SignJWT({ userId, businessId, elevated }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_DURATION}s`).sign(secret());
  (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: secureCookiesEnabled(), path: "/", maxAge: SESSION_DURATION });
}

export async function destroySession() { (await cookies()).delete(COOKIE_NAME); }

export const getCurrentUser = cache(async () => {
  const payload = await sessionPayload();
  if (!payload) return null;
  const user = await prisma.user.findFirst({
    where: { id: payload.userId, active: true },
    select: {
      id: true, email: true, name: true, role: true, preferences: true,
      platformAccess: true,
      memberships: {
        where: { active: true, deletedAt: null, business: { active: true, deletedAt: null } },
        include: { preferences: true, business: { include: { settings: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) return null;
  let membership = payload.businessId ? user.memberships.find((item) => item.businessId === payload.businessId) : undefined;
  membership ??= user.memberships.length === 1 ? user.memberships[0] : undefined;
  if (payload.businessId && !membership) return { ...user, membership: null, businessId: null, elevated: false, settings: null };
  const settings = membership ? {
    locale: user.preferences?.locale ?? "en",
    theme: user.preferences?.theme ?? "DARK",
    businessName: membership.business.name,
    currency: membership.business.settings?.currency ?? "CAD",
    timezone: membership.business.settings?.timezone ?? "America/Toronto",
    mobileNavOrder: membership.preferences?.mobileNavOrder ?? "report,calendar,gallery,settings",
    collectionViews: membership.preferences?.collectionViews ?? {},
    collapsedSections: membership.preferences?.collapsedSections ?? {},
  } : null;
  return { ...user, membership: membership ?? null, businessId: membership?.businessId ?? null, elevated: Boolean(payload.elevated && user.platformAccess?.active), settings };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { membership, businessId, settings } = user;
  if (!membership || !businessId || !settings) {
    if (user.memberships.length > 1) redirect("/workspaces");
    if (user.platformAccess?.active) redirect("/platform");
    redirect("/login?error=no-access");
  }
  return { ...user, membership, businessId, settings };
}

export async function requireBusinessPermission(permission: BusinessPermission) {
  const user = await requireUser();
  const membership = user.membership!;
  if (!hasBusinessPermission(membership.role, membership.permissionOverrides, permission) && !user.elevated) redirect("/report?error=forbidden");
  return user;
}

export async function requirePlatformPermission(permission: PlatformPermission) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const access = user.platformAccess;
  if (!access?.active || access.deletedAt || !hasPlatformPermission(access.role, access.permissionOverrides, permission)) redirect("/report?error=forbidden");
  return { ...user, platformAccess: access };
}
