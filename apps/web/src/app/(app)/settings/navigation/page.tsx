import { MobileNavigationSettings } from "@/components/mobile-navigation-settings";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";
import { parseMobileNavigation } from "@/lib/mobile-navigation";

export default async function NavigationSettingsPage() {
  const user = await requireUser();
  return <><PageHeading backHref="/settings/business" title="Mobile navigation"/><MobileNavigationSettings initialOrder={parseMobileNavigation(user.settings?.mobileNavOrder)}/></>;
}
