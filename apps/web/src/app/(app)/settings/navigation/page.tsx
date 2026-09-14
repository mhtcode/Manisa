import { redirect } from "next/navigation";

export default async function NavigationSettingsPage() {
  redirect("/settings/business#navigation");
}
