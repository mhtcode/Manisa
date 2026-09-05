"use server";

import argon2 from "argon2";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { passwordIsValid } from "@/lib/password-policy";
import { revalidatePath } from "next/cache";

export type LoginState = { error?: string };
export type PasswordChangeState = { error?: string; success?: string };

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

export async function changeOwnPassword(_: PasswordChangeState, formData: FormData): Promise<PasswordChangeState> {
  const { requireUser } = await import("@/lib/auth");
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") || "");
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("passwordConfirmation") || "");
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!account?.passwordHash || !currentPassword || !(await argon2.verify(account.passwordHash, currentPassword))) return { error: "The current password is incorrect." };
  if (password !== confirmation) return { error: "The new passwords do not match." };
  if (!passwordIsValid(password)) return { error: "Use at least 10 characters with uppercase, lowercase, a number, and a symbol." };
  if (await argon2.verify(account.passwordHash, password)) return { error: "Choose a password different from your current password." };
  const passwordHash = await argon2.hash(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, businessId: user.businessId, action: "account.password.change", targetType: "User", targetId: user.id } }),
  ]);
  revalidatePath("/settings/security");
  return { success: "Password changed successfully." };
}
