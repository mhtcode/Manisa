import { PageHeading } from "@/components/page-heading";
import { StudioSettingsForm } from "@/components/studio-settings-form";
import { requireBusinessPermission } from "@/lib/auth";

export default async function ContactSettingsPage() {
  const user = await requireBusinessPermission("business.manage");
  return <><PageHeading backHref="/settings/business" title="Contact & booking" description="Manage the contact details customers can use."/><StudioSettingsForm section="contact" settings={user.settings}/></>;
}
