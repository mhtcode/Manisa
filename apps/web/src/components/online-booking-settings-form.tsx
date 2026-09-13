"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Copy, LoaderCircle, Moon, Power, Save, Sun, Sunrise, Trash2 } from "lucide-react";
import { updateOnlineBookingSettings } from "@/server/actions/settings";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const times = Array.from({ length: 25 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
const defaultDayTimes = times.filter((time) => time >= "09:00" && time <= "17:00");

export function OnlineBookingSettingsForm({ settings }: { settings: { publicBookingEnabled: boolean; publicBookingMessage?: string | null; publicBookingLeadHours: number; publicBookingWindows: Record<string, string[]> } }) {
  const [enabled, setEnabled] = useState(settings.publicBookingEnabled);
  const [selected, setSelected] = useState(() => new Set(Object.entries(settings.publicBookingWindows).flatMap(([day, values]) => values.map((time) => `${day}:${time}`))));
  const initialDays = Object.entries(settings.publicBookingWindows).filter(([, values]) => values.length).map(([day]) => Number(day));
  const [activeDays, setActiveDays] = useState(() => new Set(initialDays));
  const [activeDay, setActiveDay] = useState(initialDays[0] ?? 1);
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const selectedValues = useMemo(() => [...selected].sort(), [selected]);

  function toggleDay(dayIndex: number) {
    setMessage("");
    setActiveDays((current) => {
      const next = new Set(current);
      if (next.has(dayIndex)) {
        next.delete(dayIndex);
        setSelected((values) => new Set([...values].filter((value) => !value.startsWith(`${dayIndex}:`))));
        if (activeDay === dayIndex) setActiveDay([...next].sort((a, b) => a - b)[0] ?? 1);
      } else {
        next.add(dayIndex);
        setSelected((values) => {
          const copy = new Set(values);
          defaultDayTimes.forEach((time) => copy.add(`${dayIndex}:${time}`));
          return copy;
        });
        setActiveDay(dayIndex);
      }
      return next;
    });
  }

  function toggleTime(time: string) {
    const value = `${activeDay}:${time}`;
    setMessage("");
    setSelected((current) => { const next = new Set(current); if (next.has(value)) next.delete(value); else next.add(value); return next; });
  }

  function fillPeriod(from: string, to: string) {
    setSelected((current) => {
      const next = new Set(current);
      times.filter((time) => time >= from && time <= to).forEach((time) => next.add(`${activeDay}:${time}`));
      return next;
    });
  }

  function clearDay() {
    setSelected((current) => new Set([...current].filter((value) => !value.startsWith(`${activeDay}:`))));
  }

  function copyMonday() {
    setSelected((current) => {
      const monday = [...current].filter((value) => value.startsWith("1:")).map((value) => value.slice(2));
      const next = new Set(current);
      for (const day of activeDays) {
        if (day === 1) continue;
        [...next].filter((value) => value.startsWith(`${day}:`)).forEach((value) => next.delete(value));
        monday.forEach((time) => next.add(`${day}:${time}`));
      }
      return next;
    });
  }

  function save(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      try { await updateOnlineBookingSettings(formData); setMessage(enabled ? "Availability published." : "Online booking is off."); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Availability could not be saved."); }
    });
  }

  const orderedActiveDays = [...activeDays].sort((a, b) => a - b);
  const hasTimes = selectedValues.length > 0;
  const success = message === "Availability published." || message === "Online booking is off.";

  return <form action={save} className="mx-auto max-w-4xl space-y-4">
    <section className="panel p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${enabled ? "bg-emerald-400/12 text-emerald-300" : "bg-white/[.04] text-slate-500"}`}><Power size={18}/></span>
        <div className="min-w-0 flex-1"><h2 className="font-semibold">Online booking</h2><p className="mt-0.5 truncate text-xs text-slate-500">Accept appointment requests from the website.</p></div>
        <div className="flex rounded-full bg-black/20 p-1" role="radiogroup" aria-label="Online booking visibility">
          <label className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${enabled ? "bg-emerald-400/18 text-emerald-200" : "text-slate-600"}`}><input checked={enabled} className="sr-only" name="publicBookingEnabled" onChange={() => { setEnabled(true); setMessage(""); }} type="radio" value="on"/>On</label>
          <label className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${!enabled ? "bg-white/[.08] text-slate-200" : "text-slate-600"}`}><input checked={!enabled} className="sr-only" name="publicBookingEnabled" onChange={() => { setEnabled(false); setMessage(""); }} type="radio" value="off"/>Off</label>
        </div>
      </div>
      {!enabled && <div className="mt-4 flex justify-end"><button aria-label="Save online booking setting" className="icon-button bg-blue-500/15 text-blue-200" disabled={pending} title="Save">{pending ? <LoaderCircle className="animate-spin" size={16}/> : <Save size={16}/>}</button></div>}
    </section>

    {enabled && <section className="panel overflow-hidden">
      <header className="flex items-center gap-3 border-b border-white/7 px-4 py-3">
        {[1, 2, 3].map((value) => <button aria-label={`Go to booking setup step ${value}`} className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition ${step === value ? "bg-blue-500 text-white" : value < step ? "bg-emerald-400/14 text-emerald-300" : "bg-white/[.04] text-slate-600"}`} key={value} onClick={() => setStep(value)} type="button">{value < step ? <Check size={14}/> : value}</button>)}
        <span className="ms-auto text-xs text-slate-500">{step === 1 ? "Working days" : step === 2 ? "Start times" : "Publish"}</span>
      </header>

      <div className="p-4 sm:p-6">
        {step === 1 && <div>
          <div className="mb-5 flex items-center gap-3"><CalendarDays className="text-blue-300" size={19}/><div><h3 className="font-semibold">Choose working days</h3><p className="mt-1 text-xs text-slate-500">A sensible 9:00–17:00 schedule is added when you open a day.</p></div></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{days.map((day, index) => <label className={`cursor-pointer rounded-xl p-3 text-center text-sm transition ${activeDays.has(index) ? "bg-blue-500/16 text-blue-100 ring-1 ring-blue-400/25" : "bg-white/[.03] text-slate-500"}`} key={day}><input checked={activeDays.has(index)} className="sr-only" onChange={() => toggleDay(index)} type="checkbox"/><span className="block text-[10px] uppercase tracking-wide opacity-60">{day.slice(0, 3)}</span><span className={`mx-auto mt-2 block size-2 rounded-full ${activeDays.has(index) ? "bg-emerald-400" : "bg-slate-700"}`}/></label>)}</div>
        </div>}

        {step === 2 && <div>
          <div className="flex gap-2 overflow-x-auto pb-2" data-horizontal-scroll>{orderedActiveDays.map((day) => <button aria-pressed={activeDay === day} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${activeDay === day ? "bg-blue-500/18 text-blue-100" : "bg-white/[.035] text-slate-500"}`} key={day} onClick={() => setActiveDay(day)} type="button">{days[day]}</button>)}</div>
          {!orderedActiveDays.length ? <button className="mt-5 text-sm text-blue-300" onClick={() => setStep(1)} type="button">Choose at least one working day</button> : <>
            <div className="my-4 flex items-center gap-1.5">
              <IconAction label="Morning" onClick={() => fillPeriod("08:00", "12:00")}><Sunrise size={16}/></IconAction>
              <IconAction label="Afternoon" onClick={() => fillPeriod("12:30", "16:30")}><Sun size={16}/></IconAction>
              <IconAction label="Evening" onClick={() => fillPeriod("17:00", "20:00")}><Moon size={16}/></IconAction>
              <IconAction label="All day" onClick={() => fillPeriod("08:00", "20:00")}><Clock3 size={16}/></IconAction>
              {activeDays.has(1) && activeDays.size > 1 && <IconAction label="Copy Monday to all open days" onClick={copyMonday}><Copy size={16}/></IconAction>}
              <span className="flex-1"/>
              <IconAction danger label={`Clear ${days[activeDay]}`} onClick={clearDay}><Trash2 size={16}/></IconAction>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-9">{times.map((time) => { const checked = selected.has(`${activeDay}:${time}`); return <label className={`cursor-pointer rounded-lg py-2.5 text-center text-[11px] font-semibold transition ${checked ? "bg-blue-500/18 text-blue-100 ring-1 ring-blue-400/25" : "bg-white/[.025] text-slate-600"}`} key={time}><input checked={checked} className="sr-only" onChange={() => toggleTime(time)} type="checkbox"/>{time}</label>; })}</div>
          </>}
        </div>}

        {step === 3 && <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3"><Check className="text-emerald-300" size={20}/><div><h3 className="font-semibold">Ready to publish</h3><p className="mt-1 text-xs text-slate-500">{selectedValues.length} available starts across {activeDays.size} days.</p></div></div>
          <label className="mt-6 block"><span className="label">Minimum notice</span><select className="field" defaultValue={settings.publicBookingLeadHours} name="publicBookingLeadHours"><option value="0">No minimum</option><option value="2">2 hours</option><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option></select></label>
          <div className="mt-6 flex justify-center"><button aria-label="Publish online booking availability" className="flex size-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition hover:bg-blue-400 active:scale-95 disabled:opacity-45" disabled={pending || !hasTimes} title="Publish">{pending ? <LoaderCircle className="animate-spin" size={19}/> : <Save size={19}/>}</button></div>
        </div>}
      </div>

      <footer className="flex items-center justify-between border-t border-white/7 px-4 py-3">
        <button aria-label="Previous step" className="icon-button" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))} title="Previous" type="button"><ArrowLeft size={17}/></button>
        <p className={`text-xs ${success ? "text-emerald-300" : "text-rose-300"}`} role="status">{message}</p>
        <button aria-label="Next step" className="icon-button" disabled={step === 3 || (step === 1 && !activeDays.size)} onClick={() => setStep((value) => Math.min(3, value + 1))} title="Next" type="button"><ArrowRight size={17}/></button>
      </footer>
    </section>}

    <input name="publicBookingMessage" type="hidden" value={settings.publicBookingMessage || "Call or message us on WhatsApp to book your appointment."}/>
    {selectedValues.map((value) => <input key={value} name="bookingSlot" type="hidden" value={value}/>)}
    {!enabled && message && <p className={`text-center text-xs ${success ? "text-emerald-300" : "text-rose-300"}`} role="status">{message}</p>}
  </form>;
}

function IconAction({ label, danger = false, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={label} className={`flex size-9 items-center justify-center rounded-full transition active:scale-95 ${danger ? "text-rose-300 hover:bg-rose-400/10" : "bg-white/[.04] text-slate-400 hover:bg-white/[.08] hover:text-white"}`} onClick={onClick} title={label} type="button">{children}</button>;
}
