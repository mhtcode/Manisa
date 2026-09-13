"use client";

import { useState, useTransition } from "react";
import { CalendarRange, Check, ChevronDown, Clock3, Copy, LoaderCircle, Power, Save } from "lucide-react";
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

  function setDay(dayIndex: number, mode: "all" | "clear", sourceDay?: number) {
    setMessage("");
    setSelected((current) => {
      const next = new Set([...current].filter((value) => !value.startsWith(`${dayIndex}:`)));
      const sourceTimes = sourceDay === undefined ? times : [...current].filter((value) => value.startsWith(`${sourceDay}:`)).map((value) => value.split(":").slice(1).join(":"));
      if (mode === "all") sourceTimes.forEach((time) => next.add(`${dayIndex}:${time}`));
      return next;
    });
  }

  function addPeriod(dayIndex: number, from: string, to: string) {
    setSelected((current) => {
      const next = new Set(current);
      times.filter((time) => time >= from && time <= to).forEach((time) => next.add(`${dayIndex}:${time}`));
      return next;
    });
  }

  function copyMondayToWeekdays() {
    setSelected((current) => {
      const monday = [...current].filter((value) => value.startsWith("1:")).map((value) => value.slice(2));
      const next = new Set([...current].filter((value) => !/^[2-5]:/.test(value)));
      for (let day = 2; day <= 5; day += 1) monday.forEach((time) => next.add(`${day}:${time}`));
      return next;
    });
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
      <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Power size={18}/></span><div><h2 className="font-semibold">Online booking visibility</h2><p className="mt-1 text-sm text-slate-500">Choose whether customers can request published times from the website.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className={`cursor-pointer rounded-2xl border p-4 transition ${enabled ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/8 bg-white/[.025]"}`}><span className="flex items-center gap-3"><input checked={enabled} className="size-4 accent-emerald-400" name="publicBookingEnabled" onChange={() => setEnabled(true)} type="radio" value="on"/><span><strong className="block text-sm">On</strong><span className="text-xs text-slate-500">Show available times and accept requests.</span></span></span></label><label className={`cursor-pointer rounded-2xl border p-4 transition ${!enabled ? "border-amber-400/35 bg-amber-400/10" : "border-white/8 bg-white/[.025]"}`}><span className="flex items-center gap-3"><input checked={!enabled} className="size-4 accent-amber-400" name="publicBookingEnabled" onChange={() => setEnabled(false)} type="radio" value="off"/><span><strong className="block text-sm">Off</strong><span className="text-xs text-slate-500">Show your contact message instead.</span></span></span></label></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="label">Minimum notice</span><select className="field" defaultValue={settings.publicBookingLeadHours} name="publicBookingLeadHours"><option value="0">No minimum</option><option value="2">2 hours</option><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option></select></label><label><span className="label">Message when booking is hidden</span><input className="field" defaultValue={settings.publicBookingMessage || "Call or message us on WhatsApp to book your appointment."} maxLength={300} name="publicBookingMessage"/></label></div>
    </section>
    <section className="panel overflow-hidden"><div className="panel-header flex-wrap"><div><h2 className="flex items-center gap-2 font-semibold"><CalendarRange size={17}/>Weekly availability</h2><p className="mt-1 text-xs text-slate-500">Appointments and pending requests are automatically removed from customer choices.</p></div><div className="flex flex-wrap items-center gap-2"><button className="button-secondary min-h-9 px-3 text-xs" onClick={copyMondayToWeekdays} type="button"><Copy size={13}/>Copy Monday to weekdays</button><span className="badge"><Clock3 size={13}/>{selected.size} starts</span></div></div>
      <div className="divide-y divide-white/8">{days.map((day, dayIndex) => { const count = [...selected].filter((value) => value.startsWith(`${dayIndex}:`)).length; return <details className="group" key={day} open={dayIndex === 1}><summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4"><span className={`size-2 rounded-full ${count ? "bg-emerald-400" : "bg-slate-700"}`}/><span className="flex-1 font-medium">{day}</span><span className="text-xs text-slate-500">{count ? `${count} starts` : "Closed"}</span><ChevronDown className="transition group-open:rotate-180" size={17}/></summary><div className="px-5 pb-5"><div className="mb-3 flex flex-wrap gap-2"><button className="button-secondary min-h-8 px-3 text-[11px]" onClick={() => addPeriod(dayIndex, "08:00", "12:00")} type="button">Morning</button><button className="button-secondary min-h-8 px-3 text-[11px]" onClick={() => addPeriod(dayIndex, "12:30", "16:30")} type="button">Afternoon</button><button className="button-secondary min-h-8 px-3 text-[11px]" onClick={() => addPeriod(dayIndex, "17:00", "20:00")} type="button">Evening</button><button className="button-secondary min-h-8 px-3 text-[11px]" onClick={() => setDay(dayIndex, "all")} type="button">All day</button><button className="min-h-8 rounded-lg px-3 text-[11px] text-rose-300 hover:bg-rose-400/10" onClick={() => setDay(dayIndex, "clear")} type="button">Clear</button></div><div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">{times.map((time) => { const value = `${dayIndex}:${time}`; const checked = selected.has(value); return <label className={`cursor-pointer rounded-xl px-2 py-2.5 text-center text-xs font-medium transition ${checked ? "bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/35" : "bg-white/[0.035] text-slate-500 hover:bg-white/[0.06]"}`} key={value}><input checked={checked} className="sr-only" name="bookingSlot" onChange={() => toggle(value)} type="checkbox" value={value}/>{time}</label>; })}</div></div></details>; })}</div>
    </section>
    <div className="flex items-center gap-3"><button className="button" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={16}/> : <Save size={16}/>}Save availability</button>{message && <span className={`flex items-center gap-1.5 text-sm ${message === "Availability published." ? "text-emerald-300" : "text-rose-300"}`}>{message === "Availability published." && <Check size={15}/>} {message}</span>}</div>
  </form>;
}
