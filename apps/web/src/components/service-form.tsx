"use client";

import { useState } from "react";
import { Ban, Check, Palette } from "lucide-react";
import { WizardNavigation, WizardProgress } from "@/components/form-wizard";

type ServiceValue = {
  name: string;
  description: string | null;
  categoryId: string;
  supportsColor: boolean;
  defaultDurationMinutes: number;
  defaultPrice: { toString(): string };
  currency: string;
};

type CategoryOption = { id: string; name: string; active: boolean };
const steps = [{ label: "Details" }, { label: "Price & time", shortLabel: "Pricing" }, { label: "Options" }];

export function ServiceForm({ action, categories, service }: { action: (data: FormData) => void | Promise<void>; categories: CategoryOption[]; service?: ServiceValue }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(service?.name || "");
  const [duration, setDuration] = useState(String(service?.defaultDurationMinutes || ""));
  const [price, setPrice] = useState(service?.defaultPrice.toString() || "");
  const [supportsColor, setSupportsColor] = useState(service?.supportsColor || false);
  const canContinue = step === 0 ? name.trim().length > 0 : step === 1 ? Number(duration) >= 5 && Number(price) >= 0 : true;
  return <form action={action} className="panel mx-auto max-w-3xl p-5 sm:p-7">
    <WizardProgress current={step} steps={steps}/>
    <section className={step === 0 ? "grid gap-5" : "hidden"}>
      <div><label className="label" htmlFor="name">Service name *</label><input className="field" dir="auto" id="name" name="name" onChange={(event) => setName(event.target.value)} required value={name}/></div>
      <div><label className="label" htmlFor="categoryId">Category *</label><select className="field" id="categoryId" name="categoryId" defaultValue={service?.categoryId || categories.find((category) => category.active)?.id} required>{categories.map((category) => <option disabled={!category.active && category.id !== service?.categoryId} key={category.id} value={category.id}>{category.name}{category.active ? "" : " (archived)"}</option>)}</select></div>
      <div><label className="label" htmlFor="description">Description</label><textarea className="field min-h-28" dir="auto" id="description" name="description" defaultValue={service?.description || ""}/></div>
    </section>
    <section className={step === 1 ? "grid gap-5 sm:grid-cols-2" : "hidden"}>
      <div><label className="label" htmlFor="defaultDurationMinutes">Duration (minutes)</label><input className="field" id="defaultDurationMinutes" min="5" name="defaultDurationMinutes" onChange={(event) => setDuration(event.target.value)} required step="5" type="number" value={duration}/></div>
      <div><label className="label" htmlFor="defaultPrice">Price</label><div className="flex gap-2"><input className="field min-w-0" id="defaultPrice" inputMode="decimal" name="defaultPrice" onChange={(event) => setPrice(event.target.value)} required value={price}/><select className="field w-24 shrink-0" name="currency" defaultValue={service?.currency || "CAD"}><option>CAD</option><option>USD</option></select></div></div>
    </section>
    <section className={step === 2 ? "block" : "hidden"}>
      <fieldset><legend className="label">Can this service have a color?</legend><div className="grid gap-3 sm:grid-cols-2">{[
        { value: true, title: "Yes, record a color", copy: "A color can be selected when the service is completed.", Icon: Palette },
        { value: false, title: "No color needed", copy: "Keep this service independent of color selection.", Icon: Ban },
      ].map(({ value, title, copy, Icon }) => <label className={`relative cursor-pointer rounded-2xl bg-white/[0.025] p-4 transition ${supportsColor === value ? "ring-2 ring-teal-300/55" : "ring-1 ring-white/10 hover:ring-white/20"}`} key={title}><input checked={supportsColor === value} className="sr-only" name="supportsColor" onChange={() => setSupportsColor(value)} type="radio" value={String(value)}/><span className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-teal-200"><Icon size={18}/></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 font-medium text-white">{title}{supportsColor === value && <Check className="text-teal-300" size={17}/>}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{copy}</span></span></span></label>)}</div></fieldset>
      <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-4"><p className="font-medium text-white" dir="auto">{name || "New service"}</p><p className="mt-2 text-sm text-slate-400">{duration || 0} min · {price || "0.00"}</p></div>
    </section>
    <WizardNavigation canContinue={canContinue} cancelHref="/services" count={steps.length} current={step} onBack={() => setStep((value) => Math.max(0, value - 1))} onNext={() => setStep((value) => Math.min(steps.length - 1, value + 1))} submitLabel="Save service"/>
  </form>;
}
