"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Clock3, LoaderCircle, Save } from "lucide-react";
import { updateOnlineBookingSettings } from "@/server/actions/settings";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const times = Array.from({ length: 25 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export function OnlineBookingSettingsForm({ settings }: { settings: { publicBookingEnabled: boolean; publicBookingMessage?: string | null; publicBookingLeadHours: number; publicBookingWindows: Record<string, string[]> } }) {
  const [enabled, setEnabled] = useState(settings.publicBookingEnabled);
  const [selected, setSelected] = useState(() => new Set(Object.entries(settings.publicBookingWindows).flatMap(([day, values]) => values.map((time) => `${day}:${time}`))));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function toggle(value: string) {
    setMessage("");
    setSelected((current) => { const next = new Set(current); if (next.has(value)) next.delete(value); else next.add(value); return next; });
  }

  function save(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      try { await updateOnlineBookingSettings(formData); setMessage("Availability published."); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Availability could not be saved."); }
    });
  }

  return <form action={save} className="space-y-5">
    <section className="panel p-5 sm:p-6">
      <label className="flex cursor-pointer items-center justify-between gap-5"><span><span className="block font-semibold">Show online booking on the landing page</span><span className="mt-1 block text-sm text-slate-500">Customers can request only the start times you publish below.</span></span><input checked={enabled} className="size-5 shrink-0 accent-blue-400" name="publicBookingEnabled" onChange={(event) => setEnabled(event.target.checked)} type="checkbox"/></label>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="label">Minimum notice</span><select className="field" defaultValue={settings.publicBookingLeadHours} name="publicBookingLeadHours"><option value="0">No minimum</option><option value="2">2 hours</option><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option></select></label><label><span className="label">Message when booking is hidden</span><input className="field" defaultValue={settings.publicBookingMessage || "Call or message us on WhatsApp to book your appointment."} maxLength={300} name="publicBookingMessage"/></label></div>
    </section>
    <section className="panel overflow-hidden"><div className="panel-header"><div><h2 className="font-semibold">Weekly available start times</h2><p className="mt-1 text-xs text-slate-500">A selected service must fit fully without overlapping another appointment.</p></div><span className="badge"><Clock3 size={13}/>{selected.size} published</span></div>
      <div className="divide-y divide-white/8">{days.map((day, dayIndex) => { const count = [...selected].filter((value) => value.startsWith(`${dayIndex}:`)).length; return <details className="group" key={day} open={dayIndex === 1}><summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4"><span className="flex-1 font-medium">{day}</span><span className="text-xs text-slate-500">{count ? `${count} times` : "Closed"}</span><ChevronDown className="transition group-open:rotate-180" size={17}/></summary><div className="grid grid-cols-3 gap-2 px-5 pb-5 sm:grid-cols-5 md:grid-cols-6">{times.map((time) => { const value = `${dayIndex}:${time}`; const checked = selected.has(value); return <label className={`cursor-pointer rounded-xl px-2 py-2.5 text-center text-xs font-medium transition ${checked ? "bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/35" : "bg-white/[0.035] text-slate-500 hover:bg-white/[0.06]"}`} key={value}><input checked={checked} className="sr-only" name="bookingSlot" onChange={() => toggle(value)} type="checkbox" value={value}/>{time}</label>; })}</div></details>; })}</div>
    </section>
    <div className="flex items-center gap-3"><button className="button" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={16}/> : <Save size={16}/>}Save availability</button>{message && <span className={`flex items-center gap-1.5 text-sm ${message === "Availability published." ? "text-emerald-300" : "text-rose-300"}`}>{message === "Availability published." && <Check size={15}/>} {message}</span>}</div>
  </form>;
}
