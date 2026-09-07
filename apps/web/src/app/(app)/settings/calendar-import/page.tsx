import { redirect } from "next/navigation";

export default function CalendarImportSettingsPage() {
  redirect("/settings/data-transfer?tab=import");
}
