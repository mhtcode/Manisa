"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Contact, LoaderCircle, MapPin, Pencil, Save, X } from "lucide-react";
import { formatCanadianPhone } from "@/lib/canadian-phone";
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
  whatsappNumber?: string | null;
  studioTagline?: string | null;
  studioBiography?: string | null;
};

type SectionKey = "identity" | "profile" | "contact";

const sections: Array<{ key: SectionKey; title: string; icon: typeof Building2 }> = [
  { key: "identity", title: "Studio identity", icon: Building2 },
  { key: "profile", title: "Public profile", icon: MapPin },
  { key: "contact", title: "Contact & booking", icon: Contact },
];

export function StudioSettingsForm({ settings }: { settings: SettingsValue }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<SectionKey | null>(null);
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
        setEditing(null);
        setSaved(true);
        window.setTimeout(() => router.refresh(), 50);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Settings could not be saved.");
      }
    });
  }

  return <form action={save} className="mx-auto max-w-3xl space-y-3" onChange={() => setSaved(false)}>
    {sections.map(({ key, title, icon: Icon }) => {
      const isEditing = editing === key;
      return <details className="group panel overflow-hidden" key={key} open={isEditing || undefined}>
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <ChevronDown className="shrink-0 text-slate-600 transition group-open:rotate-180" size={17}/>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Icon size={17}/></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold">{title}</strong><span className="mt-0.5 block truncate text-xs text-slate-500">{sectionSummary(key, settings)}</span></span>
          <button aria-label={`Modify ${title}`} className="icon-button size-9" onClick={(event) => { event.preventDefault(); setSaved(false); setEditing(key); }} title="Modify" type="button"><Pencil size={15}/></button>
        </summary>
        <fieldset className="border-t border-white/7 p-4 sm:p-5" disabled={!isEditing || pending}>
          {key === "identity" && <div className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2" label="Business name"><input className="field" defaultValue={settings.businessName} name="businessName" required/></Field>
            <Field label="Workspace language"><select className="field" name="locale" onChange={(event) => setLocale(event.target.value as SettingsValue["locale"])} value={locale}><option value="en">English</option><option value="fa">فارسی</option></select></Field>
            <Field label="Appearance"><select className="field" name="theme" onChange={(event) => setTheme(event.target.value as SettingsValue["theme"])} value={theme}><option value="DARK">Dark</option><option value="LIGHT">Light</option><option value="SYSTEM">System</option></select></Field>
            <Field label="Currency"><select className="field" name="currency" onChange={(event) => setCurrency(event.target.value)} value={currency}><option>CAD</option><option>USD</option></select></Field>
            <Field label="Business timezone"><input className="field opacity-70" readOnly value={settings.timezone}/></Field>
          </div>}
          {key === "profile" && <div className="grid gap-4">
            <Field label="Studio address"><input className="field" defaultValue={settings.address || "77 Finch Avenue East, Toronto, ON"} dir="auto" name="address"/></Field>
            <Field label="Tagline"><input className="field" defaultValue={settings.studioTagline || ""} dir="auto" maxLength={160} name="studioTagline"/></Field>
            <Field label="Short biography"><textarea className="field min-h-28 resize-y" defaultValue={settings.studioBiography || ""} dir="auto" maxLength={1200} name="studioBiography"/></Field>
          </div>}
          {key === "contact" && <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Public phone"><input autoComplete="tel" className="field" defaultValue={formatCanadianPhone(settings.publicPhone)} dir="ltr" inputMode="tel" name="publicPhone" pattern="^\+?1?[\s().-]*[2-9][0-9]{2}[\s().-]*[2-9][0-9]{2}[\s.-]*[0-9]{4}$" placeholder="+1 416 555 0100" type="tel"/></Field>
            <Field label="WhatsApp number"><input autoComplete="tel" className="field" defaultValue={formatCanadianPhone(settings.whatsappNumber)} dir="ltr" inputMode="tel" name="whatsappNumber" pattern="^\+?1?[\s().-]*[2-9][0-9]{2}[\s().-]*[2-9][0-9]{2}[\s.-]*[0-9]{4}$" placeholder="+1 416 555 0100" type="tel"/></Field>
            <Field label="Public email"><input className="field" defaultValue={settings.publicEmail || ""} dir="ltr" name="publicEmail" type="email"/></Field>
            <Field label="Booking URL"><input className="field" defaultValue={settings.bookingUrl || ""} dir="ltr" name="bookingUrl" placeholder="https://" type="url"/></Field>
          </div>}
          {isEditing && <div className="mt-5 flex items-center justify-end gap-2"><button aria-label="Cancel changes" className="icon-button" onClick={() => setEditing(null)} title="Cancel" type="button"><X size={16}/></button><button aria-label={`Save ${title}`} className="icon-button bg-blue-500/20 text-blue-100" disabled={pending} title="Save changes">{pending ? <LoaderCircle className="animate-spin" size={16}/> : <Save size={16}/>}</button></div>}
        </fieldset>
        {!isEditing && <PreservedFields section={key} settings={settings}/>}
      </details>;
    })}
    {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
    {saved && <p className="flex items-center gap-1.5 text-sm text-emerald-300"><Check size={15}/>Changes saved.</p>}
  </form>;
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={className}><span className="label">{label}</span>{children}</label>;
}

function sectionSummary(section: SectionKey, settings: SettingsValue) {
  if (section === "identity") return `${settings.businessName} · ${settings.locale === "fa" ? "فارسی" : "English"} · ${settings.theme.toLowerCase()}`;
  if (section === "profile") return settings.studioTagline || settings.address || "Landing page details";
  return formatCanadianPhone(settings.publicPhone) || settings.publicEmail || "Public contact details";
}

function PreservedFields({ section, settings }: { section: SectionKey; settings: SettingsValue }) {
  if (section === "identity") return <><input name="businessName" type="hidden" value={settings.businessName}/><input name="locale" type="hidden" value={settings.locale}/><input name="theme" type="hidden" value={settings.theme}/><input name="currency" type="hidden" value={settings.currency}/></>;
  if (section === "profile") return <><input name="address" type="hidden" value={settings.address || ""}/><input name="studioTagline" type="hidden" value={settings.studioTagline || ""}/><input name="studioBiography" type="hidden" value={settings.studioBiography || ""}/></>;
  return <><input name="publicPhone" type="hidden" value={settings.publicPhone || ""}/><input name="whatsappNumber" type="hidden" value={settings.whatsappNumber || ""}/><input name="publicEmail" type="hidden" value={settings.publicEmail || ""}/><input name="bookingUrl" type="hidden" value={settings.bookingUrl || ""}/></>;
}
