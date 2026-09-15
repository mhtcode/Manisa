import { PageHeading } from "@/components/page-heading";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import { requireUser } from "@/lib/auth";

export default async function NotificationsSettingsPage() {
  await requireUser();
  return <><PageHeading backHref="/settings/business" title="Mobile notifications" description="Install notifications and choose how this device receives them."/><PushNotificationSettings/></>;
}
