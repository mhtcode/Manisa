"use server";

import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, requirePlatformPermission } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type SetupState = { error?: string };
export type InvitationState = { error?: string; link?: string };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export async function setupPlatform(_: SetupState, formData: FormData): Promise<SetupState> {
  const env = getServerEnv();
  const token = String(formData.get("setupToken") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const businessName = String(formData.get("businessName") || "Manisa").trim();
  if (!env.PLATFORM_SETUP_TOKEN || token !== env.PLATFORM_SETUP_TOKEN) return { error: "The setup token is invalid." };
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || !businessName) return { error: "Complete every field. Passwords need at least 10 characters." };
  const passwordHash = await argon2.hash(password);
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7720260904)`;
      if (await tx.platformAccess.count({ where: { role: "ROOT_OWNER" } })) throw new Error("SETUP_CLOSED");
      const user = await tx.user.create({ data: { name, email, passwordHash, preferences: { create: {} }, platformAccess: { create: { role: "ROOT_OWNER" } } } });
      const business = await tx.business.create({ data: {
        name: businessName, slug: slugify(businessName) || "manisa", template: "NAIL_HAIR", primaryOwnerId: user.id,
        storageQuotaBytes: env.DEFAULT_STORAGE_QUOTA_BYTES, settings: { create: {} },
        memberships: { create: { userId: user.id, role: "OWNER", preferences: { create: {} } } },
      } });
      await Promise.all(["Cash", "Debit card", "Credit card", "Interac e-Transfer", "Other"].map((method, position) => tx.paymentMethod.create({ data: { businessId: business.id, name: method, position } })));
      await tx.auditLog.create({ data: { actorId: user.id, actorSnapshot: `${name} <${email}>`, businessId: business.id, action: "platform.setup", targetType: "Business", targetId: business.id, after: { name: businessName } } });
      return { user, business };
    }, { isolationLevel: "Serializable" });
    await createSession(result.user.id, result.business.id);
  } catch (error) {
    if (error instanceof Error && error.message === "SETUP_CLOSED") return { error: "Setup has already been completed." };
    if (error instanceof Error && error.message.includes("Unique constraint")) return { error: "That email or business address is already in use." };
    return { error: "Setup could not be completed." };
  }
  redirect("/report");
}

export async function createBusiness(formData: FormData) {
  const user = await requirePlatformPermission("businesses.manage");
  const name = String(formData.get("name") || "").trim();
  const requestedSlug = slugify(String(formData.get("slug") || name));
  const template = formData.get("template") === "NAIL_HAIR" ? "NAIL_HAIR" : "BLANK";
  if (!name || !requestedSlug) return;
  const business = await prisma.$transaction(async (tx) => {
    const created = await tx.business.create({ data: { name, slug: requestedSlug, template, primaryOwnerId: user.id, storageQuotaBytes: getServerEnv().DEFAULT_STORAGE_QUOTA_BYTES, settings: { create: {} }, memberships: { create: { userId: user.id, role: "OWNER", preferences: { create: {} } } } } });
    if (template === "NAIL_HAIR") await Promise.all(["Cash", "Debit card", "Credit card", "Interac e-Transfer", "Other"].map((method, position) => tx.paymentMethod.create({ data: { businessId: created.id, name: method, position } })));
    await tx.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, businessId: created.id, action: "business.create", targetType: "Business", targetId: created.id, elevated: true, after: { name, slug: requestedSlug, template } } });
    return created;
  });
  revalidatePath("/platform");
  void business;
}

export async function createBusinessInvitation(formData: FormData) {
  const user = await requirePlatformPermission("businesses.manage");
  const businessId = String(formData.get("businessId") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const roleValue = String(formData.get("role") || "ADMIN");
  const role = (["OWNER", "ADMIN", "MANAGER", "STAFF"] as const).includes(roleValue as never) ? roleValue as "OWNER" | "ADMIN" | "MANAGER" | "STAFF" : "ADMIN";
  const rawToken = randomBytes(32).toString("base64url");
  await prisma.invitation.create({ data: { tokenHash: createHash("sha256").update(rawToken).digest("hex"), email, kind: "BUSINESS", businessId, businessRole: role, invitedById: user.id, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) } });
  await prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, businessId, action: "invitation.create", targetType: "Invitation", elevated: true, after: { email, role } } });
  revalidatePath("/platform");
  return `/invite/${rawToken}`;
}

export async function enterBusiness(formData: FormData) {
  const user = await requirePlatformPermission("businesses.manage");
  const businessId = String(formData.get("businessId") || "");
  const business = await prisma.business.findFirst({ where: { id: businessId, active: true, deletedAt: null } });
  if (!business) return;
  await prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, businessId, action: "workspace.enter", targetType: "Business", targetId: businessId, elevated: true } });
  await createSession(user.id, businessId, true);
  redirect("/report");
}

export async function switchWorkspace(formData: FormData) {
  const businessId = String(formData.get("businessId") || "");
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user?.memberships.some((membership) => membership.businessId === businessId)) return;
  await createSession(user.id, businessId);
  redirect("/report");
}

export async function acceptInvitation(_: SetupState, formData: FormData): Promise<SetupState> {
  const token = String(formData.get("token") || "");
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  if (!token || !name || password.length < 10) return { error: "Enter your name and a password of at least 10 characters." };
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    const accepted = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { tokenHash } });
      if (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date()) throw new Error("INVALID_INVITATION");
      let user = await tx.user.findUnique({ where: { email: invitation.email } });
      if (user?.passwordHash && !(await argon2.verify(user.passwordHash, password))) throw new Error("INVALID_CREDENTIALS");
      const passwordHash = user?.passwordHash || await argon2.hash(password);
      user = user ? await tx.user.update({ where: { id: user.id }, data: { name: user.name || name, passwordHash, active: true } }) : await tx.user.create({ data: { email: invitation.email, name, passwordHash, preferences: { create: {} } } });
      const overrides = invitation.permissionOverrides && typeof invitation.permissionOverrides === "object" && !Array.isArray(invitation.permissionOverrides) ? invitation.permissionOverrides : {};
      if (invitation.kind === "BUSINESS" && invitation.businessId && invitation.businessRole) await tx.businessMembership.upsert({ where: { userId_businessId: { userId: user.id, businessId: invitation.businessId } }, update: { role: invitation.businessRole, permissionOverrides: overrides, active: true, deletedAt: null }, create: { userId: user.id, businessId: invitation.businessId, role: invitation.businessRole, permissionOverrides: overrides, preferences: { create: {} } } });
      if (invitation.kind === "PLATFORM" && invitation.platformRole) await tx.platformAccess.upsert({ where: { userId: user.id }, update: { role: invitation.platformRole, permissionOverrides: overrides, active: true, deletedAt: null }, create: { userId: user.id, role: invitation.platformRole, permissionOverrides: overrides } });
      await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date(), acceptedById: user.id } });
      await tx.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, businessId: invitation.businessId, action: "invitation.accept", targetType: "Invitation", targetId: invitation.id } });
      return { userId: user.id, businessId: invitation.businessId ?? undefined };
    }, { isolationLevel: "Serializable" });
    await createSession(accepted.userId, accepted.businessId);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") return { error: "This email already has an account. Enter its current password to accept the invitation." };
    return { error: "This invitation is invalid, expired, revoked, or already used." };
  }
  redirect("/report");
}

export async function inviteBusinessMember(_: InvitationState, formData: FormData): Promise<InvitationState> {
  const { requireBusinessPermission } = await import("@/lib/auth");
  const user = await requireBusinessPermission("members.manage");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const roleValue = String(formData.get("role") || "STAFF");
  const role = (["ADMIN", "MANAGER", "STAFF"] as const).includes(roleValue as never) ? roleValue as "ADMIN" | "MANAGER" | "STAFF" : "STAFF";
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
  const rawToken = randomBytes(32).toString("base64url");
  const invitation = await prisma.invitation.create({ data: { tokenHash: createHash("sha256").update(rawToken).digest("hex"), email, kind: "BUSINESS", businessId: user.businessId, businessRole: role, invitedById: user.id, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) } });
  await prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, businessId: user.businessId, action: "member.invite", targetType: "Invitation", targetId: invitation.id, after: { email, role } } });
  revalidatePath("/settings/members");
  return { link: `/invite/${rawToken}` };
}

export async function setMembershipActive(membershipId: string, active: boolean) {
  const { requireBusinessPermission } = await import("@/lib/auth");
  const user = await requireBusinessPermission("members.manage");
  const membership = await prisma.businessMembership.findFirst({ where: { id: membershipId, businessId: user.businessId }, include: { user: true } });
  if (!membership || membership.role === "OWNER") throw new Error("The business owner cannot be disabled.");
  if (membership.userId === user.id) throw new Error("You cannot disable your own active membership.");
  await prisma.businessMembership.update({ where: { id: membership.id }, data: { active } });
  await prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, businessId: user.businessId, action: active ? "membership.enable" : "membership.disable", targetType: "BusinessMembership", targetId: membership.id, before: { active: membership.active }, after: { active } } });
  revalidatePath("/settings/members");
}
