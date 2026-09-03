import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MobileNavigationSettings } from "@/components/mobile-navigation-settings";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";
import { parseMobileNavigation } from "@/lib/mobile-navigation";

export default async function NavigationSettingsPage() {
  const user = await requireUser();
  return <><PageHeading title="Mobile navigation" description="Choose the four most useful destinations and arrange them in swipe order." actions={<Link className="button-secondary" href="/settings"><ArrowLeft size={16}/>Settings</Link>}/><MobileNavigationSettings initialOrder={parseMobileNavigation(user.settings?.mobileNavOrder)}/></>;
}
