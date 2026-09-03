import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getActionNotifications } from "@/server/notifications";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const notifications = await getActionNotifications(user.id);
  return <AppShell locale={user.settings?.locale || "en"} mobileNavOrder={user.settings?.mobileNavOrder} notifications={notifications} timezone={user.settings?.timezone || "America/Toronto"} userName={user.name}>{children}</AppShell>;
}
