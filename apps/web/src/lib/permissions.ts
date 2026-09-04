import type { BusinessRole, PlatformRole, Prisma } from "@prisma/client";

export const businessPermissionKeys = [
  "customers.view", "customers.manage", "appointments.view", "appointments.manage",
  "services.view", "services.manage", "gallery.view", "gallery.manage", "reports.view",
  "financial.view", "payments.manage", "business.manage", "integrations.manage",
  "members.manage", "trash.manage",
] as const;

export type BusinessPermission = typeof businessPermissionKeys[number];
export type PlatformPermission = "businesses.manage" | "platformAdmins.manage" | "audit.view" | "storage.manage";

const allBusinessPermissions = new Set<BusinessPermission>(businessPermissionKeys);
const rolePermissions: Record<BusinessRole, Set<BusinessPermission>> = {
  OWNER: allBusinessPermissions,
  ADMIN: allBusinessPermissions,
  MANAGER: new Set(["customers.view", "customers.manage", "appointments.view", "appointments.manage", "services.view", "gallery.view", "gallery.manage", "reports.view", "financial.view", "payments.manage"]),
  STAFF: new Set(["customers.view", "customers.manage", "appointments.view", "appointments.manage", "services.view", "gallery.view", "gallery.manage"]),
};

function overrideValue(overrides: Prisma.JsonValue, key: string) {
  if (!overrides || Array.isArray(overrides) || typeof overrides !== "object") return undefined;
  const value = (overrides as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : undefined;
}

export function hasBusinessPermission(role: BusinessRole, overrides: Prisma.JsonValue, permission: BusinessPermission) {
  return overrideValue(overrides, permission) ?? rolePermissions[role].has(permission);
}

export function hasPlatformPermission(role: PlatformRole, overrides: Prisma.JsonValue, permission: PlatformPermission) {
  const override = overrideValue(overrides, permission);
  if (override !== undefined) return override;
  return role === "ROOT_OWNER" || permission !== "platformAdmins.manage";
}
