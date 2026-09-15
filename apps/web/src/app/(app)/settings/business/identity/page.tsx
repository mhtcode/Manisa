import { PageHeading } from "@/components/page-heading";
import { StudioSettingsForm } from "@/components/studio-settings-form";
import { requireBusinessPermission } from "@/lib/auth";

export default async function StudioIdentityPage() {
  const user = await requireBusinessPermission("business.manage");
  return <><PageHeading backHref="/settings/business" title="Studio identity" description="Set the workspace language and appearance for the admin system."/><StudioSettingsForm section="identity" settings={user.settings}/></>;
}
