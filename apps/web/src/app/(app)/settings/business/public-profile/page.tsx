import { PageHeading } from "@/components/page-heading";
import { StudioSettingsForm } from "@/components/studio-settings-form";
import { requireBusinessPermission } from "@/lib/auth";

export default async function PublicProfilePage() {
  const user = await requireBusinessPermission("business.manage");
  return <><PageHeading backHref="/settings/business" title="Public profile" description="Manage the studio details shown to customers."/><StudioSettingsForm section="profile" settings={user.settings}/></>;
}
