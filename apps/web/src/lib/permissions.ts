import type { Prisma, Role } from "@prisma/client";

export const businessPermissionKeys = [
  "customers.view", "customers.manage", "appointments.view", "appointments.manage",
  "services.view", "services.manage", "gallery.view", "gallery.manage", "reports.view",
  "financial.view", "payments.manage", "business.manage", "integrations.manage",
  "financial.manage", "data.import", "data.export", "members.manage", "trash.manage",
] as const;

export type BusinessPermission = typeof businessPermissionKeys[number];
const allBusinessPermissions = new Set<BusinessPermission>(businessPermissionKeys);
const rolePermissions: Record<Role, Set<BusinessPermission>> = {
  OWNER: allBusinessPermissions,
  ADMIN: allBusinessPermissions,
  MANAGER: new Set(["customers.view", "customers.manage", "appointments.view", "appointments.manage", "services.view", "gallery.view", "gallery.manage", "reports.view", "financial.view", "payments.manage", "data.import"]),
  STAFF: new Set(["customers.view", "customers.manage", "appointments.view", "appointments.manage", "services.view", "gallery.view", "gallery.manage"]),
};

function overrideValue(overrides: Prisma.JsonValue, key: string) {
  if (!overrides || Array.isArray(overrides) || typeof overrides !== "object") return undefined;
  const value = (overrides as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : undefined;
}

export function hasBusinessPermission(role: Role, overrides: Prisma.JsonValue, permission: BusinessPermission) {
  return overrideValue(overrides, permission) ?? rolePermissions[role].has(permission);
}

export function canManageStudioMember(actorRole: Role, targetRole: Role) {
  return targetRole !== "OWNER" && (actorRole === "OWNER" || (actorRole === "ADMIN" && targetRole === "STAFF"));
}
