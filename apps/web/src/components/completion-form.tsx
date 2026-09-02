"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, Check, Palette, Scissors, Sparkles } from "lucide-react";

type ServiceOption = {
  id: string;
  name: string;
  category: "NAIL" | "HAIR" | "OTHER";
  supportsColor: boolean;
  duration: number;
  price: string;
  currency: string;
};

type ScheduledLine = { serviceId: string; duration: number; price: string; selectedColor: string | null };
type LineValue = { duration: number; price: string; color: string };
type ActionResult = { error: string } | null;

export function CompletionForm({ action, appointmentId, paymentStatus, completionNotes, services, scheduledLines }: {
  action: (data: FormData) => void | Promise<void | { error: string }>;
  appointmentId: string;
  paymentStatus: string;
  completionNotes: string | null;
  services: ServiceOption[];
  scheduledLines: ScheduledLine[];
}) {
  const scheduledIds = scheduledLines.map((line) => line.serviceId);
  const [serviceIds, setServiceIds] = useState(scheduledIds);
  const [lines, setLines] = useState<Record<string, LineValue>>(() => Object.fromEntries(services.map((service) => {
    const scheduled = scheduledLines.find((line) => line.serviceId === service.id);
    return [service.id, { duration: 0, price: "", color: scheduled?.selectedColor || "#D36B85" }];
  })));
  const [actionState, formAction, isSubmitting] = useActionState<ActionResult, FormData>(async (_previous, formData) => (await action(formData)) ?? null, null);
  const groups = [
    ["NAIL", "Nail studio"],
    ["HAIR", "Hair studio"],
    ["OTHER", "Other services"],
  ] as const;
  const selectedServices = services.filter((service) => serviceIds.includes(service.id));
  const totals = useMemo(() => selectedServices.reduce((result, service) => ({
    duration: result.duration + (lines[service.id]?.duration || 0),
    price: result.price + Number(lines[service.id]?.price || 0),
  }), { duration: 0, price: 0 }), [lines, selectedServices]);

  function toggleService(service: ServiceOption) {
    setServiceIds((ids) => ids.includes(service.id) ? ids.filter((id) => id !== service.id) : [...ids, service.id]);
  }

  function updateLine(id: string, patch: Partial<LineValue>) {
    setLines((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  return (
    <form action={formAction} className="panel p-5 sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300"><BadgeCheck size={19}/></span>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Final visit record</p><h2 className="mt-0.5 font-semibold text-white">What was actually delivered?</h2></div>
      </div>

      <div className="space-y-5">
        {groups.map(([category, label]) => {
          const categoryServices = services.filter((service) => service.category === category);
          if (!categoryServices.length) return null;
          const Icon = category === "HAIR" ? Scissors : category === "NAIL" ? Palette : Sparkles;
          return <section key={category}>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.13em] text-slate-500"><Icon size={15}/>{label}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {categoryServices.map((service) => {
                const selected = serviceIds.includes(service.id);
                return <button aria-pressed={selected} className={`flex items-center gap-3 rounded-xl border p-3 text-start transition active:scale-[.99] ${selected ? "border-teal-300/35 bg-teal-300/[0.08]" : "border-white/8 bg-white/[0.02] hover:border-white/15"}`} key={service.id} onClick={() => toggleService(service)} type="button">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-teal-300/15 text-teal-300" : "bg-white/[0.05] text-slate-500"}`}><Icon size={16}/></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-100" dir="auto">{service.name}</span><span className="block text-[11px] text-slate-600">Default {service.duration} min · {service.price}</span></span>
                  <span className={`flex size-5 items-center justify-center rounded-full border ${selected ? "border-teal-300 bg-teal-300 text-slate-950" : "border-white/15 text-transparent"}`}><Check size={12} strokeWidth={3}/></span>
                </button>;
              })}
            </div>
          </section>;
        })}
      </div>

      <div className="my-6 border-t border-white/8" />
      <h3 className="font-semibold text-white">Actual time and income by service</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">Adjust these values if the visit differed from the estimate.</p>
      <div className="mt-4 space-y-3">
        {selectedServices.map((service) => <div className="rounded-xl border border-white/8 bg-black/10 p-3.5" key={service.id}>
          <p className="mb-3 text-sm font-medium text-slate-200" dir="auto">{service.name}</p>
          <div className={`grid gap-3 ${service.supportsColor ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-2"}`}>
            <div><label className="label text-xs" htmlFor={`duration-${service.id}`}>Minutes</label><input className="field" id={`duration-${service.id}`} min="1" name={`actualDuration_${service.id}`} onChange={(event) => updateLine(service.id, { duration: Number(event.target.value) })} placeholder={String(service.duration)} required type="number" value={lines[service.id]?.duration || ""}/></div>
            <div><label className="label text-xs" htmlFor={`price-${service.id}`}>Final price</label><input className="field" id={`price-${service.id}`} inputMode="decimal" name={`actualPrice_${service.id}`} onChange={(event) => updateLine(service.id, { price: event.target.value })} placeholder={service.price} required value={lines[service.id]?.price || ""}/></div>
            {service.supportsColor && <div><label className="label text-xs" htmlFor={`color-${service.id}`}>Color</label><input aria-label={`Actual color for ${service.name}`} className="h-[42px] w-12 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1" id={`color-${service.id}`} name={`serviceColor_${service.id}`} onChange={(event) => updateLine(service.id, { color: event.target.value.toUpperCase() })} type="color" value={lines[service.id]?.color || "#D36B85"}/></div>}
          </div>
          <input name="actualServiceIds" type="hidden" value={service.id}/>
        </div>)}
        {!selectedServices.length && <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm text-amber-100">Choose at least one service delivered during this visit.</div>}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div><label className="label" htmlFor="paymentStatus">Payment status</label><select className="field" id="paymentStatus" name="paymentStatus" defaultValue={paymentStatus}><option value="UNPAID">Unpaid</option><option value="PAID">Paid</option><option value="PARTIALLY_PAID">Partially paid</option></select></div>
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.055] px-4 py-3"><div><p className="text-[10px] uppercase tracking-wider text-emerald-200/55">Total time</p><p className="mt-1 font-semibold text-emerald-100">{totals.duration} min</p></div><div><p className="text-[10px] uppercase tracking-wider text-emerald-200/55">Total income</p><p className="mt-1 font-semibold text-emerald-100">{new Intl.NumberFormat("en-CA", { style: "currency", currency: selectedServices[0]?.currency || "CAD" }).format(totals.price)}</p></div></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="completionNotes">Completion notes</label><textarea className="field min-h-28" id="completionNotes" name="completionNotes" defaultValue={completionNotes || ""}/></div>
      </div>

      {actionState?.error && <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-400/8 p-3 text-sm text-rose-200" role="alert"><AlertTriangle className="mt-0.5 shrink-0" size={16}/>{actionState.error}</div>}
      <div className="mt-7 flex flex-wrap justify-end gap-3"><Link className="button-secondary" href={`/appointments/${appointmentId}`}>Cancel</Link><button className="button" disabled={!selectedServices.length || isSubmitting}><BadgeCheck size={17}/>{isSubmitting ? "Finalizing…" : "Finalize appointment"}</button></div>
    </form>
  );
}
