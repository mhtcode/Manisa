import { Save } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";
import { updateSettings } from "@/server/actions/settings";

export default async function BusinessSettingsPage() {
  const user = await requireUser();
  const settings = user.settings;
  return <><PageHeading backHref="/settings" title="Studio profile & appearance" description="Studio identity, language, financial defaults, and theme."/><form action={updateSettings} className="panel max-w-3xl p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><label className="label" htmlFor="businessName">Business name</label><input className="field" id="businessName" name="businessName" defaultValue={settings?.businessName || "Manisa"}/></div><div><label className="label" htmlFor="locale">Language</label><select className="field" id="locale" name="locale" defaultValue={settings?.locale || "en"}><option value="en">English</option><option value="fa">فارسی</option></select></div><div id="appearance"><label className="label" htmlFor="theme">Appearance</label><select className="field" id="theme" name="theme" defaultValue={settings?.theme || "DARK"}><option value="DARK">Dark</option><option value="LIGHT">Light</option><option value="SYSTEM">System</option></select></div><div><label className="label" htmlFor="currency">Currency</label><select className="field" id="currency" name="currency" defaultValue={settings?.currency || "CAD"}><option>CAD</option><option>USD</option></select></div><div><label className="label">Business timezone</label><input className="field opacity-70" value={settings?.timezone || "America/Toronto"} readOnly/></div></div><button className="button mt-7"><Save size={16}/>Save settings</button></form></>;
}
