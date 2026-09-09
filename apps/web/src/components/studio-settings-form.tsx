"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Save } from "lucide-react";
import { updateSettings } from "@/server/actions/settings";

type SettingsValue = {
  businessName: string;
  locale: "en" | "fa";
  theme: "DARK" | "LIGHT" | "SYSTEM";
  currency: string;
  timezone: string;
  publicPhone?: string | null;
  publicEmail?: string | null;
  bookingUrl?: string | null;
  studioTagline?: string | null;
  studioBiography?: string | null;
};

export function StudioSettingsForm({ settings }: { settings: SettingsValue }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [locale, setLocale] = useState(settings.locale);
  const [theme, setTheme] = useState(settings.theme);
  const [currency, setCurrency] = useState(settings.currency);

  function save(formData: FormData) {
    setSaved(false);
    setError("");
    startTransition(async () => {
      try {
        await updateSettings(formData);
        const nextLocale = String(formData.get("locale") || "en");
        document.documentElement.dataset.theme = String(formData.get("theme") || "DARK").toLowerCase();
        document.documentElement.lang = nextLocale;
        const shell = document.querySelector<HTMLElement>(".app-background");
        shell?.setAttribute("dir", nextLocale === "fa" ? "rtl" : "ltr");
        shell?.setAttribute("lang", nextLocale);
        setSaved(true);
        window.setTimeout(() => router.refresh(), 50);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Settings could not be saved.");
      }
    });
  }

  return <form action={save} className="panel max-w-3xl p-5 sm:p-7" onChange={() => setSaved(false)}>
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="label" htmlFor="businessName">Business name</label><input className="field" id="businessName" name="businessName" defaultValue={settings.businessName}/></div>
      <div><label className="label" htmlFor="locale">Workspace language</label><select className="field" id="locale" name="locale" onChange={(event) => setLocale(event.target.value as "en" | "fa")} value={locale}><option value="en">English</option><option value="fa">فارسی</option></select></div>
      <div id="appearance"><label className="label" htmlFor="theme">Appearance</label><select className="field" id="theme" name="theme" onChange={(event) => setTheme(event.target.value as SettingsValue["theme"])} value={theme}><option value="DARK">Dark</option><option value="LIGHT">Light</option><option value="SYSTEM">System</option></select></div>
      <div><label className="label" htmlFor="currency">Currency</label><select className="field" id="currency" name="currency" onChange={(event) => setCurrency(event.target.value)} value={currency}><option>CAD</option><option>USD</option></select></div>
      <div><label className="label">Business timezone</label><input className="field opacity-70" value={settings.timezone} readOnly/></div>
      <div className="sm:col-span-2 border-t border-white/8 pt-5"><h2 className="font-semibold">Public studio page</h2></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="studioTagline">Tagline</label><input className="field" dir="auto" id="studioTagline" maxLength={160} name="studioTagline" defaultValue={settings.studioTagline || ""}/></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="studioBiography">Short biography</label><textarea className="field min-h-28 resize-y" dir="auto" id="studioBiography" maxLength={1200} name="studioBiography" defaultValue={settings.studioBiography || ""}/></div>
      <div><label className="label" htmlFor="publicPhone">Public phone</label><input className="field" dir="ltr" id="publicPhone" name="publicPhone" defaultValue={settings.publicPhone || ""}/></div>
      <div><label className="label" htmlFor="publicEmail">Public email</label><input className="field" dir="ltr" id="publicEmail" name="publicEmail" type="email" defaultValue={settings.publicEmail || ""}/></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="bookingUrl">Booking URL</label><input className="field" dir="ltr" id="bookingUrl" name="bookingUrl" type="url" defaultValue={settings.bookingUrl || ""}/></div>
    </div>
    {error && <p className="mt-5 text-sm text-rose-300" role="alert">{error}</p>}
    <div className="mt-7 flex items-center gap-3"><button className="button" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={16}/> : <Save size={16}/>}Save settings</button>{saved && <span className="flex items-center gap-1.5 text-sm text-emerald-300"><Check size={15}/>Applied</span>}</div>
  </form>;
}
