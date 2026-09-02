import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { getServerEnv, secureCookiesEnabled } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "manisa_session";
const SESSION_DURATION = 60 * 60 * 12;

function secret() { return new TextEncoder().encode(getServerEnv().AUTH_SECRET); }

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_DURATION}s`).sign(secret());
  (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: secureCookiesEnabled(), path: "/", maxAge: SESSION_DURATION });
}

export async function destroySession() { (await cookies()).delete(COOKIE_NAME); }

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    return prisma.user.findFirst({ where: { id: payload.userId, active: true }, select: { id: true, email: true, name: true, role: true, settings: true } });
  } catch { return null; }
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
