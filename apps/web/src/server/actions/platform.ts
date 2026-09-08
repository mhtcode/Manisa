"use server";

import argon2 from "argon2";
import type { Prisma } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, destroySession, requireBusinessPermission } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { businessPermissionKeys, canManageStudioMember, hasBusinessPermission } from "@/lib/permissions";
import { passwordIsValid } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { connectPaymentMethodDefaults, createFinancialDefaults } from "@/server/financial-defaults";

export type SetupState = { error?: string };
export type InvitationState = { error?: string; link?: string };

export async function setupStudio(_: SetupState, formData: FormData): Promise<SetupState> {
  const env = getServerEnv();
  const token = String(formData.get("setupToken") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") || "");
  const studioName = String(formData.get("businessName") || "Manisa").trim();
  if (!env.PLATFORM_SETUP_TOKEN || token !== env.PLATFORM_SETUP_TOKEN) return { error: "The setup token is invalid." };
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !studioName) return { error: "Complete every field." };
  if (password !== passwordConfirmation) return { error: "The passwords do not match." };
  if (!passwordIsValid(password)) return { error: "Use at least 10 characters with uppercase, lowercase, a number, and a symbol." };
  const passwordHash = await argon2.hash(password);
  try {
    const user = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7720260904)`;
      if (await tx.user.count()) throw new Error("SETUP_CLOSED");
      const owner = await tx.user.create({ data: { name, email, passwordHash, role: "OWNER", preferences: { create: {} } } });
      await tx.studioSettings.upsert({ where: { id: "studio" }, create: { id: "studio", name: studioName, storageQuotaBytes: env.DEFAULT_STORAGE_QUOTA_BYTES }, update: { name: studioName } });
      await Promise.all(["Cash", "Debit card", "Credit card", "Interac e-Transfer", "Other"].map((method, position) => tx.paymentMethod.create({ data: { name: method, position } })));
      const accounts = await createFinancialDefaults(tx);
      await connectPaymentMethodDefaults(tx, { cash: accounts.cash.id, bank: accounts.bank.id, undeposited: accounts.undeposited.id });
      await tx.auditLog.create({ data: { actorId: owner.id, actorSnapshot: `${name} <${email}>`, action: "studio.setup", targetType: "StudioSettings", targetId: "studio", after: { name: studioName } } });
      return owner;
    }, { isolationLevel: "Serializable" });
    await createSession(user.id);
  } catch (error) {
    if (error instanceof Error && error.message === "SETUP_CLOSED") return { error: "Setup has already been completed." };
    if (error instanceof Error && error.message.includes("Unique constraint")) return { error: "That email is already in use." };
    return { error: "Setup could not be completed." };
  }
  redirect("/report");
}

export async function acceptInvitation(_: SetupState, formData: FormData): Promise<SetupState> {
  const token = String(formData.get("token") || "");
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") || "");
  if (!token || !name || !password) return { error: "Enter your name and password." };
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { tokenHash } });
      if (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date()) throw new Error("INVALID_INVITATION");
      let user = await tx.user.findUnique({ where: { email: invitation.email } });
      if (user?.passwordHash && !(await argon2.verify(user.passwordHash, password))) throw new Error("INVALID_CREDENTIALS");
      if (!user?.passwordHash && password !== passwordConfirmation) throw new Error("PASSWORD_MISMATCH");
      if (!user?.passwordHash && !passwordIsValid(password)) throw new Error("PASSWORD_POLICY");
      const passwordHash = user?.passwordHash || await argon2.hash(password);
      user = user
        ? await tx.user.update({ where: { id: user.id }, data: { name: user.name || name, passwordHash, role: invitation.role, permissionOverrides: invitation.permissionOverrides as Prisma.InputJsonValue, active: true, deletedAt: null } })
        : await tx.user.create({ data: { email: invitation.email, name, passwordHash, role: invitation.role, permissionOverrides: invitation.permissionOverrides as Prisma.InputJsonValue, preferences: { create: {} } } });
      await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date(), acceptedById: user.id } });
      await tx.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, action: "invitation.accept", targetType: "Invitation", targetId: invitation.id } });
    }, { isolationLevel: "Serializable" });
    await destroySession();
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") return { error: "This email already has an account. Enter its current password to accept the invitation." };
    if (error instanceof Error && error.message === "PASSWORD_MISMATCH") return { error: "The passwords do not match." };
    if (error instanceof Error && error.message === "PASSWORD_POLICY") return { error: "Use at least 10 characters with uppercase, lowercase, a number, and a symbol." };
    return { error: "This invitation is invalid, expired, revoked, or already used." };
  }
  redirect("/login?invitation=accepted");
}

export async function inviteBusinessMember(_: InvitationState, formData: FormData): Promise<InvitationState> {
  const actor = await requireBusinessPermission("members.manage");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const requestedRole = String(formData.get("role") || "STAFF");
  const role = (["ADMIN", "MANAGER", "STAFF"] as const).find((value) => value === requestedRole) || "STAFF";
  if (actor.role !== "OWNER" && role !== "STAFF") return { error: "Only the owner can invite administrators or managers." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
  const [existingUser, pendingInvitation] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true, deletedAt: true } }),
    prisma.invitation.findFirst({ where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } }),
  ]);
  if (existingUser && !existingUser.deletedAt) return { error: "A user with this email already belongs to this studio." };
  if (pendingInvitation) return { error: "An active invitation already exists for this email." };
  const rawToken = randomBytes(32).toString("base64url");
  const invitation = await prisma.invitation.create({ data: { tokenHash: createHash("sha256").update(rawToken).digest("hex"), email, role, invitedById: actor.id, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) } });
  await prisma.auditLog.create({ data: { actorId: actor.id, actorSnapshot: actor.email, action: "user.invite", targetType: "Invitation", targetId: invitation.id, after: { email, role } } });
  revalidatePath("/settings/members");
  return { link: `/invite/${rawToken}` };
}

export async function setMembershipActive(userId: string, active: boolean) {
  const actor = await requireBusinessPermission("members.manage");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === "OWNER") throw new Error("The studio owner cannot be disabled.");
  if (target.id === actor.id) throw new Error("You cannot disable your own account.");
  if (!canManageStudioMember(actor.role, target.role)) throw new Error("Administrators can manage staff accounts only.");
  await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { active } }),
    prisma.auditLog.create({ data: { actorId: actor.id, actorSnapshot: actor.email, action: active ? "user.enable" : "user.disable", targetType: "User", targetId: target.id, before: { active: target.active }, after: { active } } }),
  ]);
  revalidatePath("/settings/members");
}

export async function deleteStudioMember(userId: string) {
  const actor = await requireBusinessPermission("members.manage");
  await requireBusinessPermission("trash.manage");
  const target = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!target) throw new Error("Member not found.");
  if (target.id === actor.id) throw new Error("You cannot delete your own account.");
  if (target.role === "OWNER") throw new Error("The studio owner cannot be deleted.");
  if (!canManageStudioMember(actor.role, target.role)) throw new Error("Owners can delete administrators and staff. Administrators can delete staff only.");
  const deletedAt = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { active: false, deletedAt } }),
    prisma.auditLog.create({ data: { actorId: actor.id, actorSnapshot: actor.email, action: "user.delete", targetType: "User", targetId: target.id, before: { role: target.role, active: target.active }, after: { deletedAt } } }),
  ]);
  revalidatePath("/settings/members");
}

export async function updateMembershipAccess(userId: string, formData: FormData) {
  const actor = await requireBusinessPermission("members.manage");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === "OWNER") throw new Error("Owner access changes only through ownership transfer.");
  if (target.id === actor.id) throw new Error("You cannot change your own role or permissions.");
  const requestedRole = String(formData.get("role") || "STAFF");
  const role = (["ADMIN", "MANAGER", "STAFF"] as const).find((value) => value === requestedRole) || "STAFF";
  if (!canManageStudioMember(actor.role, target.role) || (actor.role !== "OWNER" && role !== "STAFF")) throw new Error("Administrators can manage staff access only.");
  const permissionOverrides = Object.fromEntries(businessPermissionKeys.map((key) => [key, formData.has(`permission:${key}`)]));
  for (const key of businessPermissionKeys) {
    if (permissionOverrides[key] && !hasBusinessPermission(actor.role, actor.permissionOverrides, key)) throw new Error(`You cannot grant the ${key} permission.`);
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: target.id }, data: { role, permissionOverrides } }),
    prisma.auditLog.create({ data: { actorId: actor.id, actorSnapshot: actor.email, action: "user.access.update", targetType: "User", targetId: target.id, before: { role: target.role, permissionOverrides: target.permissionOverrides }, after: { role, permissionOverrides } } }),
  ]);
  revalidatePath("/settings/members");
}

export async function transferBusinessOwnership(userId: string) {
  const actor = await requireBusinessPermission("members.manage");
  if (actor.role !== "OWNER") throw new Error("Only the current owner can transfer ownership.");
  const target = await prisma.user.findFirst({ where: { id: userId, active: true, deletedAt: null } });
  if (!target || target.id === actor.id) return;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: actor.id }, data: { role: "ADMIN" } });
    await tx.user.update({ where: { id: target.id }, data: { role: "OWNER", active: true } });
    await tx.auditLog.create({ data: { actorId: actor.id, actorSnapshot: actor.email, action: "studio.ownership.transfer", targetType: "User", targetId: target.id, before: { ownerId: actor.id }, after: { ownerId: target.id } } });
  }, { isolationLevel: "Serializable" });
  revalidatePath("/settings/members");
}
