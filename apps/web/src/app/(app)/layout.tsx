import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getActionNotifications } from "@/server/notifications";
import { businessPermissionKeys, hasBusinessPermission } from "@/lib/permissions";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = user.settings!;
  const notifications = await getActionNotifications(user.id, user.businessId!);
  const permissions = businessPermissionKeys.filter((permission) => user.elevated || hasBusinessPermission(user.membership.role, user.membership.permissionOverrides, permission));
  return <AppShell businessId={user.businessId} businessName={settings.businessName} elevated={user.elevated} locale={settings.locale} mobileNavOrder={settings.mobileNavOrder} notifications={notifications} permissions={permissions} timezone={settings.timezone} userName={user.name} workspaces={user.memberships.map((membership) => ({ businessId: membership.businessId, name: membership.business.name }))}>{children}</AppShell>;
}
