"use client";

import Link from "next/link";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

export type WizardStep = { label: string; shortLabel?: string };

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
