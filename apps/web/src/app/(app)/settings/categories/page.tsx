import { redirect } from "next/navigation";

export default function CategoriesSettingsPage() {
  redirect("/services?section=categories");
}
