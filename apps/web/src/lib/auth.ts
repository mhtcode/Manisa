import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { getServerEnv, secureCookiesEnabled } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { hasBusinessPermission, type BusinessPermission } from "@/lib/permissions";

const COOKIE_NAME = "manisa_session";
const SESSION_DURATION = 60 * 60 * 12;

function secret() { return new TextEncoder().encode(getServerEnv().AUTH_SECRET); }

export type SessionPayload = { userId: string };

export async function sessionPayload(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return typeof payload.userId === "string" ? { userId: payload.userId } : null;
  } catch { return null; }
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_DURATION}s`).sign(secret());
  (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: secureCookiesEnabled(), path: "/", maxAge: SESSION_DURATION });
}

export async function destroySession() { (await cookies()).delete(COOKIE_NAME); }

export async function getCurrentUser() {
  const payload = await sessionPayload();
  if (!payload) return null;
  const [user, studio] = await Promise.all([
    prisma.user.findFirst({
      where: { id: payload.userId, active: true, deletedAt: null },
      select: { id: true, email: true, name: true, role: true, permissionOverrides: true, preferences: true },
    }),
    prisma.studioSettings.findUnique({ where: { id: "studio" } }),
  ]);
  if (!user || !studio) return null;
  const settings = {
    locale: user.preferences?.locale ?? "en",
    theme: user.preferences?.theme ?? "DARK",
    businessName: studio.name,
    currency: studio.currency,
    timezone: studio.timezone,
    publicPhone: studio.publicPhone,
    publicEmail: studio.publicEmail,
    bookingUrl: studio.bookingUrl,
    studioTagline: studio.studioTagline,
    studioBiography: studio.studioBiography,
    financialRetentionDays: studio.financialRetentionDays,
    invoicePrefix: studio.invoicePrefix,
    mobileNavOrder: user.preferences?.mobileNavOrder ?? "report,calendar,gallery,settings",
    collectionViews: user.preferences?.collectionViews ?? {},
    collapsedSections: user.preferences?.collapsedSections ?? {},
  };
  return { ...user, access: { role: user.role, permissionOverrides: user.permissionOverrides }, settings };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permission: BusinessPermission) {
  const user = await requireUser();
  if (!hasBusinessPermission(user.role, user.permissionOverrides, permission)) redirect("/report?error=forbidden");
  return user;
}

// Source-compatible alias while feature modules adopt the shorter single-studio
// name. There is no business or workspace context behind this permission check.
export const requireBusinessPermission = requirePermission;
