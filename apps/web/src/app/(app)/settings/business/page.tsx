import { PageHeading } from "@/components/page-heading";
import { StudioSettingsForm } from "@/components/studio-settings-form";
import { requireBusinessPermission } from "@/lib/auth";

export default async function BusinessSettingsPage() {
  const user = await requireBusinessPermission("business.manage");
  const settings = user.settings;
  return <><PageHeading backHref="/settings" title="Studio profile & appearance"/><StudioSettingsForm settings={settings}/></>;
}
