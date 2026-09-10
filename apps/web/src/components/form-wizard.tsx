"use client";

import Link from "next/link";
import { Check, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

export type WizardStep = { label: string; shortLabel?: string };

export function WizardCompletion({ title, message, href, linkLabel = "Done" }: { title: string; message: string; href: string; linkLabel?: string }) {
  return <section className="panel mx-auto max-w-3xl p-6 text-center sm:p-10" role="status">
    <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-300/10 text-emerald-300"><CheckCircle2 size={27}/></span>
    <h2 className="mt-5 text-xl font-semibold text-white">{title}</h2>
    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">{message}</p>
    <Link className="button mt-7" href={href}>{linkLabel}<ChevronRight className="rtl:rotate-180" size={17}/></Link>
  </section>;
}

export function WizardApproval({ checked, onChange, label = "I reviewed the information and approve this action." }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) {
  return <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-emerald-300/[0.045] p-4 ring-1 ring-emerald-300/15">
    <input checked={checked} className="mt-0.5 size-4 shrink-0 accent-emerald-300" onChange={(event) => onChange(event.target.checked)} type="checkbox"/>
    <span className="text-sm leading-6 text-slate-300">{label}</span>
  </label>;
}

export function WizardProgress({ steps, current }: { steps: WizardStep[]; current: number }) {
  return <nav aria-label="Form progress" className="mb-6 overflow-hidden">
    <ol className="flex min-w-0 items-start">
      {steps.map((step, index) => <li aria-current={index === current ? "step" : undefined} className="relative flex min-w-0 flex-1 flex-col items-center text-center" key={step.label}>
        {index > 0 && <span aria-hidden="true" className={`absolute end-1/2 top-3.5 h-0.5 w-full ${index <= current ? "bg-teal-300" : "bg-white/10"}`}/>} 
        <span className={`relative z-10 flex size-7 items-center justify-center rounded-full border text-[11px] font-bold transition ${index < current ? "border-teal-300 bg-teal-300 text-slate-950" : index === current ? "border-teal-300 bg-[#13272a] text-teal-200 shadow-[0_0_0_4px_rgba(94,234,212,.08)]" : "border-white/12 bg-[#0d131c] text-slate-600"}`}>
          {index < current ? <Check size={13} strokeWidth={3}/> : index + 1}
        </span>
        <span className={`mt-2 max-w-full truncate px-1 text-[10px] font-medium sm:text-xs ${index <= current ? "text-slate-200" : "text-slate-600"}`}>{step.shortLabel || step.label}</span>
      </li>)}
    </ol>
  </nav>;
}

export function WizardNavigation({ current, count, canContinue = true, busy = false, cancelHref, submitLabel, busyLabel, onBack, onNext }: {
  current: number;
  count: number;
  canContinue?: boolean;
  busy?: boolean;
  cancelHref: string;
  submitLabel: string;
  busyLabel?: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const last = current === count - 1;
  return <div className="mt-7 flex min-w-0 items-center gap-2 border-t border-white/8 pt-5">
    {current === 0 ? <Link className="button-secondary" href={cancelHref}>Cancel</Link> : <button className="button-secondary" onClick={onBack} type="button"><ChevronLeft className="rtl:rotate-180" size={17}/>Back</button>}
    {last
      ? <button className="button ms-auto" disabled={!canContinue || busy} type="submit">{busy ? (busyLabel || "Saving…") : submitLabel}</button>
      : <button className="button ms-auto" disabled={!canContinue} onClick={onNext} type="button">Next<ChevronRight className="rtl:rotate-180" size={17}/></button>}
  </div>;
}
