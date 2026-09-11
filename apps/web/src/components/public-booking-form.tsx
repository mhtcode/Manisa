"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, LoaderCircle, Scissors, Sparkles, UserRound } from "lucide-react";
import { submitPublicBooking, type PublicBookingResult } from "@/server/actions/public-booking";

type PublicService = { id: string; name: string; duration: number; price: string; currency: string; categoryId: string; categoryName: string };
type Availability = { state: "idle" | "loading" | "ready" | "error"; slots: string[]; message?: string };

function dateRange(todayKey: string, count = 28) {
  const start = new Date(`${todayKey}T12:00:00Z`);
  return Array.from({ length: count }, (_, index) => { const date = new Date(start); date.setUTCDate(start.getUTCDate() + index); return { key: date.toISOString().slice(0, 10), weekday: new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: "UTC" }).format(date), day: date.getUTCDate(), month: new Intl.DateTimeFormat("en-CA", { month: "short", timeZone: "UTC" }).format(date), weekdayNumber: date.getUTCDay() }; });
}

function money(value: string, currency: string) { return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(value)); }

export function PublicBookingForm({ services, todayKey, enabledWeekdays }: { services: PublicService[]; todayKey: string; enabledWeekdays: number[] }) {
  const [step, setStep] = useState(0);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availability, setAvailability] = useState<Availability>({ state: "idle", slots: [] });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preference, setPreference] = useState("NONE");
  const [consent, setConsent] = useState(false);
  const [approved, setApproved] = useState(false);
  const [result, action, pending] = useActionState<PublicBookingResult, FormData>(submitPublicBooking, null);
  const dates = useMemo(() => dateRange(todayKey), [todayKey]);
  const selectedServices = services.filter((service) => serviceIds.includes(service.id));
  const duration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
  const total = selectedServices.reduce((sum, service) => sum + Number(service.price), 0);
  const groups = Array.from(new Map(services.map((service) => [service.categoryId, service.categoryName]))).map(([id, categoryName]) => ({ id, categoryName, services: services.filter((service) => service.categoryId === id) }));
  const steps = ["Services", "Date & time", "Your details", "Review"];
  const canContinue = step === 0 ? serviceIds.length > 0 : step === 1 ? Boolean(date && time && availability.state === "ready" && availability.slots.includes(time)) : step === 2 ? Boolean(name.trim().length >= 2 && phone.trim().length >= 7 && (preference !== "EMAIL" || email.trim()) && (preference === "NONE" || consent)) : approved;

  useEffect(() => {
    if (!date || !serviceIds.length) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailability({ state: "loading", slots: [] });
      try {
        const response = await fetch(`/api/public/availability?date=${encodeURIComponent(date)}&serviceIds=${encodeURIComponent(serviceIds.join(","))}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json() as { available?: boolean; slots?: string[]; error?: string };
        if (!response.ok || !data.available) setAvailability({ state: "error", slots: [], message: data.error || "Availability could not be loaded." });
        else setAvailability({ state: "ready", slots: data.slots || [], message: data.slots?.length ? undefined : "No times remain on this date." });
      } catch { if (!controller.signal.aborted) setAvailability({ state: "error", slots: [], message: "Availability could not be loaded." }); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [date, serviceIds]);

  if (result?.success) return <section className="rounded-[2rem] bg-white p-7 text-center shadow-[0_30px_90px_rgba(66,42,31,.14)] sm:p-10" role="status"><span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#31483c]/10 text-[#31483c]"><CheckCircle2 size={31}/></span><h3 className="mt-5 font-serif text-3xl">Request received</h3><p className="mx-auto mt-3 max-w-lg leading-7 text-[#755f54]">{result.success}</p><button className="mt-7 rounded-full bg-[#30251f] px-6 py-3 font-semibold text-white" onClick={() => window.location.reload()} type="button">Make another request</button></section>;

  return <form action={action} className="rounded-[2rem] bg-white p-4 shadow-[0_30px_90px_rgba(66,42,31,.14)] sm:p-7" onSubmit={(event) => { if (step < 3) { event.preventDefault(); if (canContinue) setStep((value) => value + 1); } else if (!canContinue) event.preventDefault(); }}>
    <ol aria-label="Booking progress" className="mb-7 flex min-w-0 items-start">{steps.map((label, index) => <li className="relative flex min-w-0 flex-1 flex-col items-center text-center" key={label}>{index > 0 && <span className={`absolute right-1/2 top-3.5 h-0.5 w-full ${index <= step ? "bg-[#c98268]" : "bg-[#30251f]/10"}`}/>}<span className={`relative z-10 flex size-7 items-center justify-center rounded-full text-xs font-bold ${index < step ? "bg-[#c98268] text-white" : index === step ? "bg-[#30251f] text-white ring-4 ring-[#c98268]/15" : "bg-[#eee5de] text-[#9c887c]"}`}>{index < step ? <Check size={14}/> : index + 1}</span><span className={`mt-2 truncate px-1 text-[10px] sm:text-xs ${index <= step ? "text-[#4d392f]" : "text-[#aa968b]"}`}>{label}</span></li>)}</ol>

    {step === 0 && <section><Heading icon={Sparkles} title="Choose your services"/><div className="space-y-5">{groups.map((group) => <div key={group.id}><h4 className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-[#9a5d48]" dir="auto">{group.categoryName}</h4><div className="grid gap-2 sm:grid-cols-2">{group.services.map((service) => { const selected = serviceIds.includes(service.id); return <button aria-pressed={selected} className={`flex min-w-0 items-center gap-3 rounded-2xl p-3.5 text-left transition ${selected ? "bg-[#31483c] text-white shadow-lg" : "bg-[#f7f1ec] text-[#30251f] hover:bg-[#efe4dc]"}`} key={service.id} onClick={() => { setServiceIds((ids) => ids.includes(service.id) ? ids.filter((id) => id !== service.id) : [...ids, service.id]); setTime(""); setAvailability({ state: "idle", slots: [] }); }} type="button"><Scissors className="shrink-0" size={17}/><span className="min-w-0 flex-1"><span className="block truncate font-semibold" dir="auto">{service.name}</span><span className={`mt-1 block text-xs ${selected ? "text-white/65" : "text-[#866e62]"}`}>{service.duration} min · {money(service.price, service.currency)}</span></span><span className={`flex size-5 shrink-0 items-center justify-center rounded-full ${selected ? "bg-white text-[#31483c]" : "bg-[#30251f]/8 text-transparent"}`}><Check size={13}/></span></button>; })}</div></div>)}</div></section>}

    {step === 1 && <section><Heading icon={CalendarDays} title="Choose a date and time"/><div className="grid grid-cols-7 gap-1.5 sm:gap-2">{dates.map((item) => { const disabled = !enabledWeekdays.includes(item.weekdayNumber); return <button aria-pressed={date === item.key} className={`min-w-0 rounded-xl px-1 py-2.5 text-center transition ${date === item.key ? "bg-[#30251f] text-white" : disabled ? "cursor-not-allowed bg-[#f4efeb] text-[#c5b7af]" : "bg-[#f7f1ec] text-[#4d392f] hover:bg-[#eadbd1]"}`} disabled={disabled} key={item.key} onClick={() => { setDate(item.key); setTime(""); setAvailability({ state: "idle", slots: [] }); }} type="button"><span className="block text-[9px] uppercase">{item.weekday}</span><span className="mt-1 block text-sm font-bold">{item.day}</span><span className="block text-[9px]">{item.month}</span></button>; })}</div><label className="mt-4 block text-xs font-semibold text-[#755f54]" htmlFor="public-booking-date">Or choose another date</label><input className="mt-1 h-12 w-full rounded-xl bg-[#f7f1ec] px-4 outline-none ring-[#c98268]/30 focus:ring-4" id="public-booking-date" max={dates.at(-1)?.key} min={todayKey} onChange={(event) => { setDate(event.target.value); setTime(""); setAvailability({ state: "idle", slots: [] }); }} type="date" value={date}/><div className="mt-5"><p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Clock3 size={16}/>Available times</p>{availability.state === "loading" ? <p className="flex items-center gap-2 py-4 text-sm text-[#866e62]"><LoaderCircle className="animate-spin" size={17}/>Checking the calendar…</p> : availability.slots.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{availability.slots.map((slot) => <button aria-pressed={time === slot} className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition ${time === slot ? "bg-[#c98268] text-white" : "bg-[#f7f1ec] hover:bg-[#eadbd1]"}`} key={slot} onClick={() => setTime(slot)} type="button">{new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" }).format(new Date(`2020-01-01T${slot}:00`))}</button>)}</div> : <p className="rounded-xl bg-[#f7f1ec] p-4 text-sm text-[#866e62]">{availability.message || "Select a date to see available times."}</p>}</div></section>}

    {step === 2 && <section><Heading icon={UserRound} title="Tell us how to reach you"/><div className="grid gap-4 sm:grid-cols-2"><Field label="Your name *"><input className="public-field" maxLength={120} name="name" onChange={(event) => setName(event.target.value)} required value={name}/></Field><Field label="Phone number *"><input className="public-field" inputMode="tel" maxLength={50} name="phone" onChange={(event) => setPhone(event.target.value)} required value={phone}/></Field><Field label="Email · optional"><input className="public-field" maxLength={160} name="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email}/></Field><Field label="Appointment updates"><select className="public-field" name="notificationPreference" onChange={(event) => { setPreference(event.target.value); if (event.target.value === "NONE") setConsent(false); }} value={preference}><option value="NONE">No updates for now</option><option value="WHATSAPP">WhatsApp</option><option value="SMS">Text message</option><option value="EMAIL">Email</option></select></Field><Field className="sm:col-span-2" label="Notes · optional"><textarea className="public-field min-h-24 resize-y" maxLength={1000} name="notes" placeholder="Anything the studio should know?"/></Field>{preference !== "NONE" && <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-xl bg-[#31483c]/7 p-4 text-sm leading-6 text-[#5d493f]"><input checked={consent} className="mt-1 accent-[#31483c]" name="consent" onChange={(event) => setConsent(event.target.checked)} type="checkbox"/>I agree to receive updates about this appointment through {preference === "WHATSAPP" ? "WhatsApp" : preference === "SMS" ? "text message" : "email"}.</label>}<input className="hidden" name="website" tabIndex={-1}/></div></section>}

    {step === 3 && <section><Heading icon={CheckCircle2} title="Review your request"/><div className="grid gap-4 rounded-2xl bg-[#f7f1ec] p-4 sm:grid-cols-2"><Summary label="Services" value={selectedServices.map((service) => service.name).join(" · ")}/><Summary label="Date & time" value={`${date} · ${time}`}/><Summary label="Estimated visit" value={`${duration} min · ${money(total.toFixed(2), selectedServices[0]?.currency || "CAD")}`}/><Summary label="Contact" value={`${name} · ${phone}`}/></div><label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-[#c98268]/10 p-4 text-sm leading-6"><input checked={approved} className="mt-1 accent-[#c98268]" onChange={(event) => setApproved(event.target.checked)} type="checkbox"/>I reviewed this request and understand the studio will confirm it.</label>{result?.error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{result.error}</p>}</section>}

    {serviceIds.map((id) => <input key={id} name="serviceIds" type="hidden" value={id}/>)}<input name="date" type="hidden" value={date}/><input name="time" type="hidden" value={time}/>
    <div className="mt-7 flex gap-2 border-t border-[#30251f]/10 pt-5">{step > 0 && <button className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold text-[#5d493f] hover:bg-[#f7f1ec]" onClick={() => setStep((value) => value - 1)} type="button"><ArrowLeft size={16}/>Back</button>}<button className="ms-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-[#30251f] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35" disabled={!canContinue || pending} type={step === 3 ? "submit" : "button"} onClick={step === 3 ? undefined : () => setStep((value) => value + 1)}>{pending ? <><LoaderCircle className="animate-spin" size={16}/>Sending…</> : step === 3 ? "Request appointment" : <>Next<ArrowRight size={16}/></>}</button></div>
  </form>;
}

function Heading({ icon: Icon, title }: { icon: typeof Sparkles; title: string }) { return <div className="mb-5 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-[#c98268]/12 text-[#9a5d48]"><Icon size={18}/></span><h3 className="font-serif text-2xl">{title}</h3></div>; }
function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { return <label className={className}><span className="mb-1.5 block text-xs font-semibold text-[#755f54]">{label}</span>{children}</label>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9a5d48]">{label}</p><p className="mt-1.5 break-words text-sm font-semibold" dir="auto">{value}</p></div>; }
