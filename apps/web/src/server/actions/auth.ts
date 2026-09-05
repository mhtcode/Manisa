"use server";

import argon2 from "argon2";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, include: { memberships: { where: { active: true, deletedAt: null, business: { active: true, deletedAt: null } }, orderBy: { createdAt: "asc" } }, platformAccess: true } });
  if (!user || !user.active || !user.passwordHash || !(await argon2.verify(user.passwordHash, parsed.data.password))) {
    return { error: "The email or password is incorrect." };
  }
  const membership = user.memberships[0];
  if (!membership && !user.platformAccess?.active) {
    return { error: "Your account or workspace access is disabled. Contact the owner." };
  }
  await createSession(user.id, user.memberships.length === 1 ? membership?.businessId : undefined);
  if (user.memberships.length > 1) redirect("/workspaces");
  if (membership) redirect("/report");
  if (user.platformAccess?.active) redirect("/platform");
  redirect("/login?error=no-access");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
