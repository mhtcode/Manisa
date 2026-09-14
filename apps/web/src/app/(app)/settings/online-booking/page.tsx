import { OnlineBookingSettingsForm } from "@/components/online-booking-settings-form";
import { PublicBookingCatalogEditor } from "@/components/public-booking-catalog-editor";
import { PageHeading } from "@/components/page-heading";
import { requireBusinessPermission } from "@/lib/auth";
import { normalizeBookingWindows, normalizePublicBookingCatalog } from "@/lib/public-booking";

export default async function OnlineBookingSettingsPage() {
  const user = await requireBusinessPermission("business.manage");
  const catalog = normalizePublicBookingCatalog(user.settings.publicBookingCatalog);
  return <><PageHeading backHref="/settings" title="Online booking"/><OnlineBookingSettingsForm catalogEditor={<PublicBookingCatalogEditor currency={user.settings.currency} initialCatalog={catalog}/>} settings={{ publicBookingEnabled: user.settings.publicBookingEnabled, publicBookingMessage: user.settings.publicBookingMessage, publicBookingLeadHours: user.settings.publicBookingLeadHours, publicBookingWindows: normalizeBookingWindows(user.settings.publicBookingWindows) }}/></>;
}
