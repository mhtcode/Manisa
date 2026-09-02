import { CalendarImportForm } from "@/components/calendar-import-form";
import { MobileNavigationSettings } from "@/components/mobile-navigation-settings";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";
import { googleCalendarConfigured } from "@/lib/env";
import { parseMobileNavigation } from "@/lib/mobile-navigation";
import { updateSettings } from "@/server/actions/settings";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = user.settings;
  const configured = googleCalendarConfigured();
  return <>
    <PageHeading title="Settings" description="Business preferences, imports, appearance, and integrations."/>
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <form action={updateSettings} className="panel p-5 sm:p-7"><h2 className="font-medium">Business preferences</h2><div className="mt-6 grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><label className="label" htmlFor="businessName">Business name</label><input className="field" id="businessName" name="businessName" defaultValue={settings?.businessName || "Manisa"}/></div><div><label className="label" htmlFor="locale">Language</label><select className="field" id="locale" name="locale" defaultValue={settings?.locale || "en"}><option value="en">English</option><option value="fa">فارسی</option></select></div><div><label className="label" htmlFor="theme">Appearance</label><select className="field" id="theme" name="theme" defaultValue={settings?.theme || "DARK"}><option value="DARK">Dark</option><option value="LIGHT">Light</option><option value="SYSTEM">System</option></select></div><div><label className="label" htmlFor="currency">Currency</label><select className="field" id="currency" name="currency" defaultValue={settings?.currency || "CAD"}><option>CAD</option><option>USD</option></select></div><div><label className="label">Business timezone</label><input className="field opacity-70" value={settings?.timezone || "America/Toronto"} readOnly/></div></div><button className="button mt-7">Save settings</button></form>
        <div className="space-y-5"><section className="panel p-5 sm:p-6"><h2 className="font-medium">Profile & security</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-600">Name</dt><dd className="mt-1 text-slate-300">{user.name}</dd></div><div><dt className="text-slate-600">Email</dt><dd className="mt-1 text-slate-300">{user.email}</dd></div><div><dt className="text-slate-600">Role</dt><dd className="mt-1 text-slate-300">Administrator</dd></div></dl></section><section className="panel p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="font-medium">Google Calendar</h2><span className={`badge ${configured ? "border-amber-400/20 bg-amber-400/10 text-amber-300" : "border-white/10 text-slate-500"}`}>{configured ? "Credentials found" : "Not connected"}</span></div><p className="mt-4 text-sm leading-6 text-slate-500">Historical file import works without a live connection. Optional two-way synchronization remains separate from this importer.</p></section></div>
      </div>
      <MobileNavigationSettings initialOrder={parseMobileNavigation(settings?.mobileNavOrder)}/>
      <CalendarImportForm/>
    </div>
  </>;
}
