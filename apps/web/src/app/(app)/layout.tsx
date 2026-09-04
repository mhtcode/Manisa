import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getActionNotifications } from "@/server/notifications";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = user.settings!;
  const notifications = await getActionNotifications(user.id, user.businessId!);
  return <AppShell businessId={user.businessId} businessName={settings.businessName} elevated={user.elevated} locale={settings.locale} mobileNavOrder={settings.mobileNavOrder} notifications={notifications} timezone={settings.timezone} userName={user.name} workspaces={user.memberships.map((membership) => ({ businessId: membership.businessId, name: membership.business.name }))}>{children}</AppShell>;
}
