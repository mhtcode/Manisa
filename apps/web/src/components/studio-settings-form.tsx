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
  address?: string | null;
  publicPhone?: string | null;
  publicEmail?: string | null;
  bookingUrl?: string | null;
  publicBookingEnabled: boolean;
  publicBookingMessage?: string | null;
  publicBookingDays: string;
  publicBookingOpenTime: string;
  publicBookingCloseTime: string;
  publicBookingSlotMins: number;
  publicBookingLeadHours: number;
  whatsappNumber?: string | null;
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
  const [publicBookingEnabled, setPublicBookingEnabled] = useState(settings.publicBookingEnabled);

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
      <div><label className="label" htmlFor="address">Studio address</label><input className="field" dir="auto" id="address" name="address" defaultValue={settings.address || "77 Finch Avenue East, Toronto, ON"}/></div>
      <div className="sm:col-span-2 border-t border-white/8 pt-5"><h2 className="font-semibold">Public studio page</h2></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="studioTagline">Tagline</label><input className="field" dir="auto" id="studioTagline" maxLength={160} name="studioTagline" defaultValue={settings.studioTagline || ""}/></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="studioBiography">Short biography</label><textarea className="field min-h-28 resize-y" dir="auto" id="studioBiography" maxLength={1200} name="studioBiography" defaultValue={settings.studioBiography || ""}/></div>
      <div><label className="label" htmlFor="publicPhone">Public phone</label><input className="field" dir="ltr" id="publicPhone" name="publicPhone" defaultValue={settings.publicPhone || ""}/></div>
      <div><label className="label" htmlFor="publicEmail">Public email</label><input className="field" dir="ltr" id="publicEmail" name="publicEmail" type="email" defaultValue={settings.publicEmail || ""}/></div>
      <div><label className="label" htmlFor="whatsappNumber">WhatsApp number</label><input className="field" dir="ltr" id="whatsappNumber" name="whatsappNumber" placeholder="+1 416 555 0100" defaultValue={settings.whatsappNumber || ""}/></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="bookingUrl">Booking URL</label><input className="field" dir="ltr" id="bookingUrl" name="bookingUrl" type="url" defaultValue={settings.bookingUrl || ""}/></div>
      <div className="sm:col-span-2 border-t border-white/8 pt-5"><h2 className="font-semibold">Online appointment requests</h2></div>
      <label className="sm:col-span-2 flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-white/[0.035] p-4"><span><span className="block text-sm font-semibold text-white">Show booking calendar on the landing page</span><span className="mt-1 block text-xs text-slate-500">Requests are added to the Manisa calendar as scheduled appointments for your confirmation.</span></span><input checked={publicBookingEnabled} className="size-5 shrink-0 accent-blue-400" name="publicBookingEnabled" onChange={(event) => setPublicBookingEnabled(event.target.checked)} type="checkbox"/></label>
      <div className="sm:col-span-2"><label className="label" htmlFor="publicBookingMessage">Message when online booking is hidden</label><textarea className="field min-h-20 resize-y" dir="auto" id="publicBookingMessage" maxLength={300} name="publicBookingMessage" defaultValue={settings.publicBookingMessage || "Call or message us on WhatsApp to book your appointment."}/></div>
      {publicBookingEnabled && <>
        <fieldset className="sm:col-span-2"><legend className="label">Days customers can book</legend><div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{[[0,"Sun"],[1,"Mon"],[2,"Tue"],[3,"Wed"],[4,"Thu"],[5,"Fri"],[6,"Sat"]].map(([day, label]) => <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/[0.035] px-2 py-3 text-xs text-slate-300" key={day}><input className="accent-blue-400" defaultChecked={settings.publicBookingDays.split(",").includes(String(day))} name="bookingDay" type="checkbox" value={day}/>{label}</label>)}</div></fieldset>
        <div><label className="label" htmlFor="publicBookingOpenTime">First available time</label><input className="field" dir="ltr" id="publicBookingOpenTime" name="publicBookingOpenTime" type="time" defaultValue={settings.publicBookingOpenTime}/></div>
        <div><label className="label" htmlFor="publicBookingCloseTime">Last finish time</label><input className="field" dir="ltr" id="publicBookingCloseTime" name="publicBookingCloseTime" type="time" defaultValue={settings.publicBookingCloseTime}/></div>
        <div><label className="label" htmlFor="publicBookingSlotMins">Time interval</label><select className="field" id="publicBookingSlotMins" name="publicBookingSlotMins" defaultValue={settings.publicBookingSlotMins}><option value="15">Every 15 minutes</option><option value="30">Every 30 minutes</option><option value="45">Every 45 minutes</option><option value="60">Every hour</option></select></div>
        <div><label className="label" htmlFor="publicBookingLeadHours">Minimum notice</label><select className="field" id="publicBookingLeadHours" name="publicBookingLeadHours" defaultValue={settings.publicBookingLeadHours}><option value="0">No minimum</option><option value="2">2 hours</option><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option></select></div>
      </>}
      {!publicBookingEnabled && <>{settings.publicBookingDays.split(",").map((day) => <input key={day} name="bookingDay" type="hidden" value={day}/>)}<input name="publicBookingOpenTime" type="hidden" value={settings.publicBookingOpenTime}/><input name="publicBookingCloseTime" type="hidden" value={settings.publicBookingCloseTime}/><input name="publicBookingSlotMins" type="hidden" value={settings.publicBookingSlotMins}/><input name="publicBookingLeadHours" type="hidden" value={settings.publicBookingLeadHours}/></>}
    </div>
    {error && <p className="mt-5 text-sm text-rose-300" role="alert">{error}</p>}
    <div className="mt-7 flex items-center gap-3"><button className="button" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={16}/> : <Save size={16}/>}Save settings</button>{saved && <span className="flex items-center gap-1.5 text-sm text-emerald-300"><Check size={15}/>Applied</span>}</div>
  </form>;
}
