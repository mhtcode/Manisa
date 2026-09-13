import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getActionNotifications } from "@/server/notifications";
import { businessPermissionKeys, hasBusinessPermission } from "@/lib/permissions";

export const metadata = { robots: { index: false, follow: false } };

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = user.settings;
  const notifications = await getActionNotifications(user.id);
  const permissions = businessPermissionKeys.filter((permission) => hasBusinessPermission(user.role, user.permissionOverrides, permission));
  return <AppShell businessName={settings.businessName} locale={settings.locale} mobileNavOrder={settings.mobileNavOrder} notifications={notifications} permissions={permissions} timezone={settings.timezone} userName={user.name}>{children}</AppShell>;
}
