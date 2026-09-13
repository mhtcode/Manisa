import type { Role } from "@prisma/client";
import { businessPermissionKeys, rolePermissionDefaults, type BusinessPermission } from "./permissions";

export type MemberAccessDraft = {
  role: Role;
  permissions: Record<BusinessPermission, boolean>;
};

export function createMemberAccessDraft(role: Role, permissions: Partial<Record<BusinessPermission, boolean>>): MemberAccessDraft {
  const defaults = rolePermissionDefaults(role);
  return {
    role,
    permissions: Object.fromEntries(businessPermissionKeys.map((key) => [key, permissions[key] ?? defaults[key]])) as Record<BusinessPermission, boolean>,
  };
}

export function selectMemberRolePreset(role: Role): MemberAccessDraft {
  return createMemberAccessDraft(role, rolePermissionDefaults(role));
}
