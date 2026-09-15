import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getActionNotifications } from "@/server/notifications";
import { businessPermissionKeys, hasBusinessPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const metadata = { robots: { index: false, follow: false } };

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = user.settings;
  const [notifications, pendingReviewCount] = await Promise.all([getActionNotifications(user.id), prisma.studioReview.count({ where: { status: "PENDING", deletedAt: null } })]);
  const permissions = businessPermissionKeys.filter((permission) => hasBusinessPermission(user.role, user.permissionOverrides, permission));
  return <AppShell businessName={settings.businessName} locale={settings.locale} mobileNavOrder={settings.mobileNavOrder} notifications={notifications} pendingReviewCount={pendingReviewCount} permissions={permissions} timezone={settings.timezone} userName={user.name}>{children}</AppShell>;
}
