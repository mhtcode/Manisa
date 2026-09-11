import { OnlineBookingSettingsForm } from "@/components/online-booking-settings-form";
import { PageHeading } from "@/components/page-heading";
import { requireBusinessPermission } from "@/lib/auth";
import { normalizeBookingWindows } from "@/lib/public-booking";

export default async function OnlineBookingSettingsPage() {
  const user = await requireBusinessPermission("business.manage");
  return <><PageHeading backHref="/settings" title="Online booking"/><OnlineBookingSettingsForm settings={{ publicBookingEnabled: user.settings.publicBookingEnabled, publicBookingMessage: user.settings.publicBookingMessage, publicBookingLeadHours: user.settings.publicBookingLeadHours, publicBookingWindows: normalizeBookingWindows(user.settings.publicBookingWindows) }}/></>;
}
