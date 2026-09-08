import { redirect } from "next/navigation";

export default async function PlatformPage() {
  redirect("/settings");
}
