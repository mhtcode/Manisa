"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, DollarSign, Search, Scissors, Sparkles, UserRound } from "lucide-react";

type Option = { id: string; name: string; phone?: string | null; email?: string | null };
type ServiceOption = Option & { duration: number; price: string; currency: string };
type AppointmentValue = { customerId: string; serviceIds: string[]; startAt: string; expectedDurationMinutes: number; expectedPrice: string; notes?: string | null };

type AppointmentFormProps = {
  action: (data: FormData) => void | Promise<void>;
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
  const initialServices = appointment?.serviceIds.length ? appointment.serviceIds : services[0] ? [services[0].id] : [];
  const initialDateTime = appointment?.startAt || initialStartAt || "";
  const [customerId, setCustomerId] = useState(initialCustomer);
  const [customerQuery, setCustomerQuery] = useState(customers.find((customer) => customer.id === initialCustomer)?.name || "");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [serviceIds, setServiceIds] = useState<string[]>(initialServices);
  const initialSelectedServices = services.filter((service) => initialServices.includes(service.id));
  const [duration, setDuration] = useState(appointment?.expectedDurationMinutes || initialSelectedServices.reduce((sum, service) => sum + service.duration, 0) || 60);
  const [price, setPrice] = useState(appointment?.expectedPrice || initialSelectedServices.reduce((sum, service) => sum + Number(service.price), 0).toFixed(2) || "0.00");
  const [date, setDate] = useState(initialDateTime.split("T")[0] || "");
  const [time, setTime] = useState(initialDateTime.split("T")[1]?.slice(0, 5) || "09:00");
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const selectedServices = services.filter((service) => serviceIds.includes(service.id));
  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLocaleLowerCase();
    if (!query) return customers.slice(0, 8);
    return customers.filter((customer) => [customer.name, customer.phone, customer.email].some((value) => value?.toLocaleLowerCase().includes(query))).slice(0, 8);
  }, [customerQuery, customers]);

  function toggleService(id: string) {
    const nextIds = serviceIds.includes(id) ? serviceIds.filter((serviceId) => serviceId !== id) : [...serviceIds, id];
    const nextServices = services.filter((service) => nextIds.includes(service.id));
    setServiceIds(nextIds);
    setDuration(nextServices.reduce((sum, service) => sum + service.duration, 0));
    setPrice(nextServices.reduce((sum, service) => sum + Number(service.price), 0).toFixed(2));
  }

  return (
    <form action={action} className="grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="space-y-5">
        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-300/10 text-teal-300"><UserRound size={19} /></span><div><h2 className="font-semibold text-white">Who is this appointment for?</h2><p className="mt-1 text-sm text-slate-500">Start typing a name, phone number, or email.</p></div></div>
          <div className="relative">
            <div className={`flex items-center gap-3 rounded-xl border bg-[#090e15] px-3.5 transition ${customerOpen ? "border-teal-300/50 ring-2 ring-teal-300/8" : "border-white/10"}`}>
              <Search className="shrink-0 text-slate-500" size={18} />
              <input aria-autocomplete="list" aria-controls="appointment-customer-results" aria-expanded={customerOpen} autoComplete="off" className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" dir="auto" onChange={(event) => { setCustomerQuery(event.target.value); setCustomerId(""); setCustomerOpen(true); }} onFocus={() => setCustomerOpen(true)} placeholder="Search customers…" role="combobox" value={customerQuery} />
              {selectedCustomer && <Check className="text-teal-300" size={18} />}
            </div>
            {customerOpen && <div className="absolute inset-x-0 top-[calc(100%+.5rem)] z-30 overflow-hidden rounded-2xl border border-white/10 bg-[#101720] p-1.5 shadow-[0_22px_60px_rgba(0,0,0,.55)]" id="appointment-customer-results" role="listbox">
              {filteredCustomers.map((customer) => <button aria-selected={customer.id === customerId} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition hover:bg-white/[0.055]" key={customer.id} onClick={() => { setCustomerId(customer.id); setCustomerQuery(customer.name); setCustomerOpen(false); }} role="option" type="button"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.055] text-sm font-semibold text-slate-300">{customer.name.slice(0, 1).toLocaleUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-medium text-white" dir="auto">{customer.name}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{customer.phone || customer.email || "No contact details"}</span></span></button>)}
              {!filteredCustomers.length && <div className="px-3 py-4 text-center text-sm text-slate-500">No matching customers.</div>}
              <Link className="mt-1 flex items-center justify-center rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-sm font-medium text-teal-300 hover:bg-teal-300/[0.05]" href="/customers/new">+ Create a new customer</Link>
            </div>}
            <input name="customerId" type="hidden" value={customerId} />
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-300/10 text-violet-300"><Sparkles size={19} /></span><div><h2 className="font-semibold text-white">Choose one or more services</h2><p className="mt-1 text-sm text-slate-500">Duration and price update automatically as services are added.</p></div></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((service, index) => {
              const selected = serviceIds.includes(service.id);
              const Icon = index % 2 ? Scissors : Sparkles;
              return <button aria-pressed={selected} className={`flex items-center gap-3 rounded-2xl border p-3.5 text-start transition ${selected ? "border-teal-300/35 bg-teal-300/[0.085]" : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"}`} key={service.id} onClick={() => toggleService(service.id)} type="button"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-teal-300/15 text-teal-300" : "bg-white/[0.05] text-slate-500"}`}><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white" dir="auto">{service.name}</span><span className="mt-1 block text-xs text-slate-500">{service.duration} min · {money(service.price, service.currency)}</span></span><span className={`flex size-5 items-center justify-center rounded-full border ${selected ? "border-teal-300 bg-teal-300 text-slate-950" : "border-white/15 text-transparent"}`}><Check size={13} strokeWidth={3} /></span></button>;
            })}
          </div>
          {serviceIds.map((id) => <input key={id} name="serviceIds" type="hidden" value={id} />)}
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-300/10 text-sky-300"><CalendarDays size={19} /></span><div><h2 className="font-semibold text-white">When does it happen?</h2><p className="mt-1 text-sm text-slate-500">Choose the start time, then adjust the combined duration if needed.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="appointment-date">Date *</label><input className="field h-12" id="appointment-date" onChange={(event) => setDate(event.target.value)} required type="date" value={date} /></div>
            <div><label className="label" htmlFor="appointment-time">Start time *</label><input className="field h-12" id="appointment-time" onChange={(event) => setTime(event.target.value)} required type="time" value={time} /></div>
            <div><label className="label" htmlFor="expectedDurationMinutes">Total duration</label><div className="relative"><Clock3 className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input className="field h-12 ps-10" id="expectedDurationMinutes" min="5" name="expectedDurationMinutes" onChange={(event) => setDuration(Number(event.target.value))} required step="5" type="number" value={duration} /></div></div>
            <div><label className="label" htmlFor="expectedPrice">Total price</label><div className="relative"><DollarSign className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input className="field h-12 ps-10" id="expectedPrice" inputMode="decimal" name="expectedPrice" onChange={(event) => setPrice(event.target.value)} required value={price} /></div></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="notes">Notes</label><textarea className="field min-h-24 resize-y" defaultValue={appointment?.notes || ""} id="notes" name="notes" placeholder="Add preparation notes, preferences, or reminders…" /></div>
          </div>
          <input name="startAt" type="hidden" value={date && time ? `${date}T${time}` : ""} />
        </section>
      </div>

      <aside className="h-fit xl:sticky xl:top-24"><section className="panel overflow-hidden"><div className="border-b border-white/8 px-5 py-4"><p className="text-sm font-semibold text-white">Appointment summary</p></div><div className="space-y-5 p-5">
        <div><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">Customer</p><p className="mt-2 text-sm font-medium text-slate-200" dir="auto">{selectedCustomer?.name || "Not selected"}</p></div>
        <div><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">Services</p><div className="mt-2 space-y-1.5">{selectedServices.length ? selectedServices.map((service) => <p className="flex items-center gap-2 text-sm text-slate-300" dir="auto" key={service.id}><Sparkles className="shrink-0 text-teal-300" size={13} />{service.name}</p>) : <p className="text-sm text-slate-500">None selected</p>}</div></div>
        <div className="grid grid-cols-2 gap-3 border-y border-white/8 py-4"><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Duration</p><p className="mt-1 text-sm font-semibold text-white">{duration || 0} min</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Total</p><p className="mt-1 text-sm font-semibold text-white">{money(price || "0", selectedServices[0]?.currency)}</p></div></div>
        <div><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">Schedule</p><p className="mt-2 text-sm text-slate-300">{date || "Choose a date"}{time ? ` · ${time}` : ""}</p></div>
        <button className="button w-full" disabled={!customerId || !serviceIds.length || !date || !time} type="submit"><CalendarDays size={17} />{appointment ? "Update appointment" : "Create appointment"}</button>
        <Link className="button-secondary w-full" href={appointment ? "/appointments" : "/calendar"}>Cancel</Link>
      </div></section></aside>
    </form>
  );
}
