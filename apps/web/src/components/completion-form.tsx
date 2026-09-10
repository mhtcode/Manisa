"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, Check, Plus, Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { WizardApproval, WizardCompletion, WizardNavigation, WizardProgress } from "@/components/form-wizard";
import { PhotoUploadField } from "@/components/photo-upload-field";

type ServiceOption = {
  id: string;
  name: string;
  category: { id: string; name: string; icon: string };
  supportsColor: boolean;
  duration: number;
  price: string;
  currency: string;
};

type ScheduledLine = { serviceId: string; duration: number; price: string; selectedColor: string | null };
type LineValue = { duration: number; price: string; color: string };
type ActionResult = { error?: string; success?: string; redirectTo?: string } | null;

const steps = [
  { label: "Services" },
  { label: "Time & price", shortLabel: "Time" },
  { label: "Payment" },
  { label: "Details" },
  { label: "Review" },
];

export function CompletionForm({ action, appointmentId, completionNotes, services, scheduledLines, paymentMethods }: {
  action: (data: FormData) => void | Promise<void | { error?: string; success?: string; redirectTo?: string }>;
  appointmentId: string;
  completionNotes: string | null;
  services: ServiceOption[];
  scheduledLines: ScheduledLine[];
  paymentMethods: Array<{ id: string; name: string }>;
}) {
  const scheduledIds = scheduledLines.map((line) => line.serviceId);
  const [step, setStep] = useState(0);
  const [approved, setApproved] = useState(false);
  const [serviceIds, setServiceIds] = useState(scheduledIds);
  const [lines, setLines] = useState<Record<string, LineValue>>(() => Object.fromEntries(services.map((service) => {
    const scheduled = scheduledLines.find((line) => line.serviceId === service.id);
    return [service.id, { duration: scheduled?.duration || service.duration, price: scheduled?.price || service.price, color: scheduled?.selectedColor || "#D36B85" }];
  })));
  const [actionState, formAction, isSubmitting] = useActionState<ActionResult, FormData>(async (_previous, formData) => (await action(formData)) ?? null, null);
  const [payments, setPayments] = useState<Array<{ key: number; methodId: string; amount: string }>>([]);
  const groups = Array.from(new Map(services.map((service) => [service.category.id, service.category])).values());
  const selectedServices = services.filter((service) => serviceIds.includes(service.id));
  const totals = useMemo(() => selectedServices.reduce((result, service) => ({
    duration: result.duration + (lines[service.id]?.duration || 0),
    price: result.price + Number(lines[service.id]?.price || 0),
  }), { duration: 0, price: 0 }), [lines, selectedServices]);
  const paidTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const validLines = selectedServices.length > 0 && selectedServices.every((service) => lines[service.id]?.duration > 0 && Number(lines[service.id]?.price) >= 0);
  const validPayments = paidTotal <= totals.price && payments.every((payment) => payment.methodId && Number(payment.amount) > 0);
  const canContinue = step === 0 ? selectedServices.length > 0 : step === 1 ? validLines : step === 2 ? validPayments : step === 4 ? approved : true;

  function toggleService(service: ServiceOption) {
    setServiceIds((ids) => ids.includes(service.id) ? ids.filter((id) => id !== service.id) : [...ids, service.id]);
  }

  function updateLine(id: string, patch: Partial<LineValue>) {
    setLines((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  if (actionState?.success && actionState.redirectTo) return <WizardCompletion href={actionState.redirectTo} linkLabel="View finalized appointment" message="The final record is saved. This screen stays open until you choose to leave it." title={actionState.success}/>;

  return <form action={formAction} className="panel mx-auto max-w-4xl p-5 sm:p-7" onSubmit={(event) => {
    if (step < steps.length - 1) {
      event.preventDefault();
      if (canContinue) setStep((value) => Math.min(steps.length - 1, value + 1));
      return;
    }
    if (!canContinue || isSubmitting) event.preventDefault();
  }}>
    <div className="mb-6 flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300"><BadgeCheck size={19}/></span>
      <h2 className="font-semibold text-white">Finalize appointment</h2>
    </div>
    <WizardProgress current={step} steps={steps}/>

    <section className={step === 0 ? "block" : "hidden"}>
      <h3 className="mb-4 font-semibold text-white">Services completed</h3>
      <div className="space-y-5">
        {groups.map((category) => <div key={category.id}>
          <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.13em] text-slate-500"><CategoryIcon name={category.icon} size={15}/>{category.name}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.filter((service) => service.category.id === category.id).map((service) => {
              const selected = serviceIds.includes(service.id);
              return <button aria-pressed={selected} className={`flex items-center gap-3 rounded-xl border p-3 text-start transition ${selected ? "border-teal-300/35 bg-teal-300/[0.08]" : "border-white/8 bg-white/[0.02] hover:border-white/15"}`} key={service.id} onClick={() => toggleService(service)} type="button">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-teal-300/15 text-teal-300" : "bg-white/[0.05] text-slate-500"}`}><CategoryIcon name={category.icon} size={16}/></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-100" dir="auto">{service.name}</span><span className="block text-[11px] text-slate-600">{service.duration} min · {service.price}</span></span>
                <span className={`flex size-5 items-center justify-center rounded-full border ${selected ? "border-teal-300 bg-teal-300 text-slate-950" : "border-white/15 text-transparent"}`}><Check size={12} strokeWidth={3}/></span>
              </button>;
            })}
          </div>
        </div>)}
      </div>
    </section>

    <section className={step === 1 ? "block" : "hidden"}>
      <h3 className="mb-4 font-semibold text-white">Actual time and price</h3>
      <div className="space-y-3">
        {selectedServices.map((service) => <div className="rounded-xl border border-white/8 bg-black/10 p-3.5" key={service.id}>
          <p className="mb-3 text-sm font-medium text-slate-200" dir="auto">{service.name}</p>
          <div className={`grid gap-3 ${service.supportsColor ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" : "grid-cols-2"}`}>
            <div><label className="label text-xs" htmlFor={`duration-${service.id}`}>Minutes</label><input className="field" id={`duration-${service.id}`} min="1" name={`actualDuration_${service.id}`} onChange={(event) => updateLine(service.id, { duration: Number(event.target.value) })} required type="number" value={lines[service.id]?.duration || ""}/></div>
            <div><label className="label text-xs" htmlFor={`price-${service.id}`}>Final price</label><input className="field" id={`price-${service.id}`} inputMode="decimal" name={`actualPrice_${service.id}`} onChange={(event) => updateLine(service.id, { price: event.target.value })} required value={lines[service.id]?.price || ""}/></div>
            {service.supportsColor && <div><label className="label text-xs" htmlFor={`color-${service.id}`}>Color</label><input aria-label={`Actual color for ${service.name}`} className="h-[42px] w-12 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1" id={`color-${service.id}`} name={`serviceColor_${service.id}`} onChange={(event) => updateLine(service.id, { color: event.target.value.toUpperCase() })} type="color" value={lines[service.id]?.color || "#D36B85"}/></div>}
          </div>
          <input name="actualServiceIds" type="hidden" value={service.id}/>
        </div>)}
      </div>
    </section>

    <section className={step === 2 ? "block" : "hidden"}>
      <div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-semibold text-white">Payment received</h3><button className="icon-button size-9" disabled={!paymentMethods.length} onClick={() => setPayments((items) => [...items, { key: Date.now(), methodId: paymentMethods[0]?.id || "", amount: "" }])} title="Add payment" type="button"><Plus size={16}/><span className="sr-only">Add payment</span></button></div>
      <div className="space-y-2">{payments.map((payment) => <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,.7fr)_auto] gap-2" key={payment.key}><select className="field" name="paymentMethodId" onChange={(event) => setPayments((items) => items.map((item) => item.key === payment.key ? { ...item, methodId: event.target.value } : item))} value={payment.methodId}>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select><input aria-label="Payment amount" className="field" inputMode="decimal" name="paymentAmount" onChange={(event) => setPayments((items) => items.map((item) => item.key === payment.key ? { ...item, amount: event.target.value } : item))} placeholder="0.00" value={payment.amount}/><button aria-label="Remove payment" className="icon-button border-rose-400/20 text-rose-300" onClick={() => setPayments((items) => items.filter((item) => item.key !== payment.key))} title="Remove payment" type="button"><Trash2 size={15}/></button></div>)}</div>
      {!payments.length && <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4 text-sm text-slate-400">No payment recorded. The appointment will be unpaid.</div>}
      <p className={`mt-3 text-sm ${paidTotal > totals.price ? "text-rose-300" : "text-slate-400"}`}>{paidTotal === 0 ? "Unpaid" : paidTotal < totals.price ? `Partially paid · ${paidTotal.toFixed(2)}` : paidTotal === totals.price ? "Paid in full" : "Payments exceed the final price"}</p>
    </section>

    <section className={step === 3 ? "block space-y-5" : "hidden"}>
      <div><label className="label" htmlFor="completionNotes">Notes</label><textarea className="field min-h-28" id="completionNotes" name="completionNotes" defaultValue={completionNotes || ""}/></div>
      <PhotoUploadField disabled={isSubmitting}/>
    </section>

    <section className={step === 4 ? "block" : "hidden"}>
      <h3 className="mb-4 font-semibold text-white">Review final record</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4"><p className="text-xs text-slate-500">Services</p><div className="mt-2 space-y-1">{selectedServices.map((service) => <p className="text-sm text-slate-200" dir="auto" key={service.id}>{service.name}</p>)}</div></div>
        <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.055] p-4"><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-emerald-200/55">Total time</p><p className="mt-1 font-semibold text-emerald-100">{totals.duration} min</p></div><div><p className="text-xs text-emerald-200/55">Final total</p><p className="mt-1 font-semibold text-emerald-100">{new Intl.NumberFormat("en-CA", { style: "currency", currency: selectedServices[0]?.currency || "CAD" }).format(totals.price)}</p></div></div><p className="mt-4 border-t border-emerald-300/10 pt-3 text-sm text-emerald-100/75">{paidTotal === 0 ? "Unpaid" : paidTotal < totals.price ? `Paid ${paidTotal.toFixed(2)} · balance ${(totals.price - paidTotal).toFixed(2)}` : "Paid in full"}</p></div>
      </div>
      <WizardApproval checked={approved} label="I reviewed the completed services, final prices, time, and payment information." onChange={setApproved}/>
    </section>

    {actionState?.error && <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-400/8 p-3 text-sm text-rose-200" role="alert"><AlertTriangle className="mt-0.5 shrink-0" size={16}/>{actionState.error}</div>}
    <WizardNavigation busy={isSubmitting} busyLabel="Finalizing…" canContinue={canContinue} cancelHref={`/appointments/${appointmentId}`} count={steps.length} current={step} onBack={() => setStep((value) => Math.max(0, value - 1))} onNext={() => setStep((value) => Math.min(steps.length - 1, value + 1))} submitLabel="Finalize appointment"/>
  </form>;
}
