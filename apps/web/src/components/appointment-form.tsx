"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, Check, CircleCheck, Clock3, DollarSign, LoaderCircle, Search, Sparkles, UserRound } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { checkAppointmentAvailability } from "@/server/actions/appointments";

type Option = { id: string; name: string; phone?: string | null; email?: string | null };
type ServiceCategoryOption = { id: string; name: string; description: string | null; icon: string; accentColor: string };
type ServiceOption = Option & { duration: number; price: string; currency: string; category: ServiceCategoryOption; supportsColor: boolean };
type AppointmentValue = { id: string; customerId: string; serviceIds: string[]; serviceColors: Record<string, string>; startAt: string; expectedDurationMinutes: number; expectedPrice: string; notes?: string | null };
type ActionResult = { error: string } | null;

type AppointmentFormProps = {
  action: (data: FormData) => void | Promise<void | { error: string }>;
  appointment?: AppointmentValue;
  customers: Option[];
  initialCustomerId?: string;
  initialStartAt?: string;
  services: ServiceOption[];
};

function money(value: string, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(value));
}

export function AppointmentForm({ action, customers, services, appointment, initialCustomerId, initialStartAt }: AppointmentFormProps) {
  const initialCustomer = appointment?.customerId || initialCustomerId || "";
  const initialServices = appointment?.serviceIds.length ? appointment.serviceIds : [];
  const initialDateTime = appointment?.startAt || initialStartAt || "";
  const [customerId, setCustomerId] = useState(initialCustomer);
  const [customerQuery, setCustomerQuery] = useState(customers.find((customer) => customer.id === initialCustomer)?.name || "");
  const [customerOpen, setCustomerOpen] = useState(false);
  const customerPickerRef = useRef<HTMLDivElement>(null);
  const [serviceIds, setServiceIds] = useState<string[]>(initialServices);
  const [serviceColors, setServiceColors] = useState<Record<string, string>>(appointment?.serviceColors || {});
  const initialSelectedServices = services.filter((service) => initialServices.includes(service.id));
  const [duration, setDuration] = useState(appointment?.expectedDurationMinutes || initialSelectedServices.reduce((sum, service) => sum + service.duration, 0));
  const [price, setPrice] = useState(appointment?.expectedPrice || (initialSelectedServices.length ? initialSelectedServices.reduce((sum, service) => sum + Number(service.price), 0).toFixed(2) : ""));
  const [date, setDate] = useState(initialDateTime.split("T")[0] || "");
  const [time, setTime] = useState(initialDateTime.split("T")[1]?.slice(0, 5) || "09:00");
  const [availability, setAvailability] = useState<{ state: "idle" | "checking" | "available" | "conflict"; key?: string; message?: string; conflictId?: string }>({ state: "idle" });
  const [actionState, formAction, isSubmitting] = useActionState<ActionResult, FormData>(async (_previous, formData) => (await action(formData)) ?? null, null);
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const selectedServices = services.filter((service) => serviceIds.includes(service.id));
  const availabilityKey = date && time && duration >= 5 ? `${date}T${time}|${duration}` : "";
  const currentAvailability = !availabilityKey
    ? { state: "idle" as const, message: "Choose a date and time to check availability." }
    : availability.key === availabilityKey
      ? availability
      : { state: "checking" as const, message: "Checking this time against scheduled appointments…" };
  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLocaleLowerCase();
    if (!query) return customers.slice(0, 8);
    return customers.filter((customer) => [customer.name, customer.phone, customer.email].some((value) => value?.toLocaleLowerCase().includes(query))).slice(0, 8);
  }, [customerQuery, customers]);
  const serviceGroups = Array.from(new Map(services.map((service) => [service.category.id, service.category])).values())
    .map((category) => ({ ...category, services: services.filter((service) => service.category.id === category.id) }));

  useEffect(() => {
    if (!availabilityKey) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        if (!cancelled) setAvailability({ state: "checking", key: availabilityKey, message: "Checking this time against scheduled appointments…" });
        const result = await checkAppointmentAvailability(`${date}T${time}`, duration, appointment?.id);
        if (!cancelled) setAvailability({ state: result.available ? "available" : "conflict", key: availabilityKey, message: result.message, conflictId: result.conflictId });
      } catch {
        if (!cancelled) setAvailability({ state: "idle", key: availabilityKey, message: "Availability could not be checked. It will be checked again when you save." });
      }
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [appointment?.id, availabilityKey, date, duration, time]);

  useEffect(() => {
    function closeWhenOutside(event: Event) {
      if (!customerPickerRef.current?.contains(event.target as Node)) setCustomerOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setCustomerOpen(false);
    }
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("click", closeWhenOutside);
    document.addEventListener("focusin", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("click", closeWhenOutside);
      document.removeEventListener("focusin", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function toggleService(id: string) {
    const nextIds = serviceIds.includes(id) ? serviceIds.filter((serviceId) => serviceId !== id) : [...serviceIds, id];
    const nextServices = services.filter((service) => nextIds.includes(service.id));
    setServiceIds(nextIds);
    setDuration(nextServices.reduce((sum, service) => sum + service.duration, 0));
    setPrice(nextServices.length ? nextServices.reduce((sum, service) => sum + Number(service.price), 0).toFixed(2) : "");
    const service = services.find((item) => item.id === id);
    if (!serviceIds.includes(id) && service?.supportsColor && !serviceColors[id]) setServiceColors((colors) => ({ ...colors, [id]: "#D36B85" }));
  }

  return (
    <form action={formAction} className="grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="space-y-5">
        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-300/10 text-teal-300"><UserRound size={19} /></span><div><h2 className="font-semibold text-white">Who is this appointment for?</h2><p className="mt-1 text-sm text-slate-500">Start typing a name, phone number, or email.</p></div></div>
          <div className="relative" ref={customerPickerRef}>
            <div className={`flex items-center gap-3 rounded-xl border bg-[#090e15] px-3.5 transition ${customerOpen ? "border-white/20 bg-[#0b1119] shadow-[0_0_0_3px_rgba(148,163,184,.055)]" : "border-white/10"}`}>
              <Search className="shrink-0 text-slate-500" size={18} />
              <input aria-autocomplete="list" aria-controls="appointment-customer-results" aria-expanded={customerOpen} autoComplete="off" className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" dir="auto" onChange={(event) => { setCustomerQuery(event.target.value); setCustomerId(""); setCustomerOpen(true); }} onFocus={() => setCustomerOpen(true)} placeholder="Search customers…" role="combobox" value={customerQuery} />
              {selectedCustomer && <Check className="text-teal-300" size={18} />}
            </div>
            {customerOpen && <div className="absolute inset-x-0 top-[calc(100%+.5rem)] z-30 max-h-[min(28rem,60vh)] overflow-y-auto rounded-2xl border border-white/10 bg-[#101720] p-1.5 shadow-[0_22px_60px_rgba(0,0,0,.55)]" id="appointment-customer-results" role="listbox">
              {filteredCustomers.map((customer) => <button aria-selected={customer.id === customerId} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition hover:bg-white/[0.055]" key={customer.id} onClick={() => { setCustomerId(customer.id); setCustomerQuery(customer.name); setCustomerOpen(false); }} role="option" type="button"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.055] text-sm font-semibold text-slate-300">{customer.name.slice(0, 1).toLocaleUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-medium text-white" dir="auto">{customer.name}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{customer.phone || customer.email || "No contact details"}</span></span></button>)}
              {!filteredCustomers.length && <div className="px-3 py-4 text-center text-sm text-slate-500">No matching customers.</div>}
              <Link className="mt-1 flex items-center justify-center rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-sm font-medium text-teal-300 hover:bg-teal-300/[0.05]" href="/customers/new">+ Create a new customer</Link>
            </div>}
            <input name="customerId" type="hidden" value={customerId} />
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-300/10 text-violet-300"><Sparkles size={19} /></span><h2 className="font-semibold text-white">Choose one or more services</h2></div>
          <div className="space-y-5">
            {serviceGroups.map((group) => <div key={group.id}>
              <div className="mb-2.5 flex items-center gap-2">
                <CategoryIcon name={group.icon} size={16}/>
                <div><h3 className="text-sm font-semibold text-slate-200">{group.name}</h3><p className="text-[11px] text-slate-600">{group.description || "Studio services"}</p></div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.services.map((service) => {
                  const selected = serviceIds.includes(service.id);
                  return <div className={`overflow-hidden rounded-2xl border transition ${selected ? "border-teal-300/35 bg-teal-300/[0.075]" : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"}`} key={service.id}>
                    <button aria-pressed={selected} className="flex w-full items-center gap-3 p-3.5 text-start active:scale-[.99]" onClick={() => toggleService(service.id)} type="button"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-teal-300/15 text-teal-300" : "bg-white/[0.05] text-slate-500"}`}><CategoryIcon name={service.category.icon} size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white" dir="auto">{service.name}</span><span className="mt-1 block text-xs text-slate-500">{service.duration} min · {money(service.price, service.currency)}</span></span><span className={`flex size-5 items-center justify-center rounded-full border ${selected ? "border-teal-300 bg-teal-300 text-slate-950" : "border-white/15 text-transparent"}`}><Check size={13} strokeWidth={3} /></span></button>
                    {selected && service.supportsColor && <div className="flex items-center gap-2 border-t border-white/8 px-3.5 py-3">
                      <input aria-label={`Choose color for ${service.name}`} className="h-8 w-10 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5" name={`serviceColor_${service.id}`} onChange={(event) => setServiceColors((colors) => ({ ...colors, [service.id]: event.target.value.toUpperCase() }))} type="color" value={serviceColors[service.id] || "#D36B85"} />
                      <span className="min-w-0 flex-1 text-xs text-slate-400">Chosen color</span>
                      <span className="font-mono text-[11px] text-slate-500">{serviceColors[service.id] || "#D36B85"}</span>
                    </div>}
                  </div>;
                })}
              </div>
            </div>)}
          </div>
          {serviceIds.map((id) => <input key={id} name="serviceIds" type="hidden" value={id} />)}
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-300/10 text-sky-300"><CalendarDays size={19} /></span><div><h2 className="font-semibold text-white">Schedule the estimated visit</h2><p className="mt-1 text-sm text-slate-500">The selected time is checked automatically for overlaps.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="appointment-date">Date *</label><input className="field h-12" id="appointment-date" onChange={(event) => setDate(event.target.value)} required type="date" value={date} /></div>
            <div><label className="label" htmlFor="appointment-time">Start time *</label><input className="field h-12" id="appointment-time" onChange={(event) => setTime(event.target.value)} required type="time" value={time} /></div>
            <div><label className="label" htmlFor="expectedDurationMinutes">Estimated duration</label><div className="relative"><Clock3 className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input className="field h-12 ps-10" id="expectedDurationMinutes" min="5" name="expectedDurationMinutes" onChange={(event) => setDuration(Number(event.target.value))} placeholder="60" required step="5" type="number" value={duration || ""} /></div></div>
            <div><label className="label" htmlFor="expectedPrice">Estimated price</label><div className="relative"><DollarSign className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input className="field h-12 ps-10" id="expectedPrice" inputMode="decimal" name="expectedPrice" onChange={(event) => setPrice(event.target.value)} placeholder="0.00" required value={price} /></div></div>
            <div className={`sm:col-span-2 flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm ${currentAvailability.state === "conflict" ? "border-rose-400/25 bg-rose-400/8 text-rose-200" : currentAvailability.state === "available" ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-200" : "border-white/8 bg-white/[0.025] text-slate-400"}`} role="status">
              {currentAvailability.state === "checking" ? <LoaderCircle className="mt-0.5 shrink-0 animate-spin" size={17}/> : currentAvailability.state === "conflict" ? <AlertTriangle className="mt-0.5 shrink-0" size={17}/> : <CircleCheck className="mt-0.5 shrink-0" size={17}/>}<span className="leading-5">{currentAvailability.message}{currentAvailability.conflictId && <Link className="ms-1 font-semibold underline underline-offset-2" href={`/appointments/${currentAvailability.conflictId}`}>View conflict</Link>}</span>
            </div>
            <div className="sm:col-span-2"><label className="label" htmlFor="notes">Notes</label><textarea className="field min-h-24 resize-y" defaultValue={appointment?.notes || ""} id="notes" name="notes" placeholder="Add preparation notes, preferences, or reminders…" /></div>
          </div>
          <input name="startAt" type="hidden" value={date && time ? `${date}T${time}` : ""} />
        </section>
      </div>

      <aside className="h-fit xl:sticky xl:top-24"><section className="panel overflow-hidden"><div className="border-b border-white/8 px-5 py-4"><p className="text-sm font-semibold text-white">Appointment summary</p></div><div className="space-y-5 p-5">
        <div><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">Customer</p><p className="mt-2 text-sm font-medium text-slate-200" dir="auto">{selectedCustomer?.name || "Not selected"}</p></div>
        <div><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">Services</p><div className="mt-2 space-y-1.5">{selectedServices.length ? selectedServices.map((service) => <p className="flex items-center gap-2 text-sm text-slate-300" dir="auto" key={service.id}><Sparkles className="shrink-0 text-teal-300" size={13} />{service.name}</p>) : <p className="text-sm text-slate-500">None selected</p>}</div></div>
        <div className="grid grid-cols-2 gap-3 border-y border-white/8 py-4"><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Est. duration</p><p className="mt-1 text-sm font-semibold text-white">{duration || 0} min</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Est. total</p><p className="mt-1 text-sm font-semibold text-white">{money(price || "0", selectedServices[0]?.currency)}</p></div></div>
        <div><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">Schedule</p><p className="mt-2 text-sm text-slate-300">{date || "Choose a date"}{time ? ` · ${time}` : ""}</p></div>
        {actionState?.error && <div className="flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-400/8 p-3 text-xs leading-5 text-rose-200" role="alert"><AlertTriangle className="mt-0.5 shrink-0" size={15}/><span>{actionState.error}</span></div>}
        <button className="button w-full" disabled={!customerId || !serviceIds.length || !date || !time || currentAvailability.state === "checking" || currentAvailability.state === "conflict" || isSubmitting} type="submit"><CalendarDays size={17} />{isSubmitting ? "Saving…" : appointment ? "Update estimate" : "Schedule appointment"}</button>
        <Link className="button-secondary w-full" href={appointment ? "/appointments" : "/calendar"}>Cancel</Link>
      </div></section></aside>
    </form>
  );
}
