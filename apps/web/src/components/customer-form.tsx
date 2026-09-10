"use client";

import { useActionState, useState } from "react";
import { CustomerReferralPicker, type ReferralOption } from "@/components/customer-referral-picker";
import { WizardApproval, WizardCompletion, WizardNavigation, WizardProgress } from "@/components/form-wizard";

type CustomerValue = {
  firstName: string;
  lastName?: string | null;
  displayName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  preferredLanguage: "en" | "fa";
  referrerId?: string | null;
};

const steps = [{ label: "Identity" }, { label: "Contact" }, { label: "Preferences" }];

export function CustomerForm({ action, customer, referralOptions }: {
  action: (data: FormData) => void | Promise<void | { error?: string; success?: string; redirectTo?: string }>;
  customer?: CustomerValue;
  referralOptions: ReferralOption[];
}) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState(customer?.firstName || "");
  const [approved, setApproved] = useState(false);
  const [result, formAction, pending] = useActionState(async (_previous: { error?: string; success?: string; redirectTo?: string } | null, data: FormData) => (await action(data)) || null, null);
  if (result?.success && result.redirectTo) return <WizardCompletion href={result.redirectTo} linkLabel="View customer" message="The customer details are saved. Continue when you are ready." title={result.success}/>;
  const canContinue = step === 0 ? firstName.trim().length > 0 : step === steps.length - 1 ? approved : true;
  return <form action={formAction} className="panel mx-auto max-w-3xl p-5 sm:p-7" onSubmit={(event) => {
    if (step < steps.length - 1) {
      event.preventDefault();
      if (canContinue) setStep((value) => Math.min(steps.length - 1, value + 1));
      return;
    }
    if (!canContinue || pending) event.preventDefault();
  }}>
    <WizardProgress current={step} steps={steps}/>
    <section className={step === 0 ? "grid gap-5 sm:grid-cols-2" : "hidden"}>
      <div><label className="label" htmlFor="firstName">First name *</label><input className="field" dir="auto" id="firstName" name="firstName" onChange={(event) => setFirstName(event.target.value)} required maxLength={100} value={firstName}/></div>
      <div><label className="label" htmlFor="lastName">Last name</label><input className="field" dir="auto" id="lastName" name="lastName" defaultValue={customer?.lastName || ""}/></div>
      <div><label className="label" htmlFor="displayName">Display name</label><input className="field" dir="auto" id="displayName" name="displayName" defaultValue={customer?.displayName || ""}/></div>
      <div><label className="label" htmlFor="preferredLanguage">Preferred language</label><select className="field" id="preferredLanguage" name="preferredLanguage" defaultValue={customer?.preferredLanguage || "en"}><option value="en">English</option><option value="fa">فارسی</option></select></div>
    </section>
    <section className={step === 1 ? "grid gap-5 sm:grid-cols-2" : "hidden"}>
      <div><label className="label" htmlFor="phone">Phone</label><input className="field" dir="ltr" id="phone" name="phone" type="tel" defaultValue={customer?.phone || ""}/></div>
      <div><label className="label" htmlFor="email">Email</label><input className="field" dir="ltr" id="email" name="email" type="email" defaultValue={customer?.email || ""}/></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="address">Address</label><input className="field" dir="auto" id="address" name="address" defaultValue={customer?.address || ""}/></div>
    </section>
    <section className={step === 2 ? "grid gap-5" : "hidden"}>
      <div><label className="label" htmlFor="referrer-search">Referred by</label><CustomerReferralPicker customers={referralOptions} initialId={customer?.referrerId}/></div>
      <div><label className="label" htmlFor="notes">Notes</label><textarea className="field min-h-32 resize-y" dir="auto" id="notes" name="notes" defaultValue={customer?.notes || ""}/></div>
      <WizardApproval checked={approved} label="I reviewed the customer information." onChange={setApproved}/>
    </section>
    {result?.error && <p className="mt-4 text-sm text-rose-300" role="alert">{result.error}</p>}
    <WizardNavigation busy={pending} canContinue={canContinue} cancelHref="/customers" count={steps.length} current={step} onBack={() => setStep((value) => Math.max(0, value - 1))} onNext={() => setStep((value) => Math.min(steps.length - 1, value + 1))} submitLabel="Save customer"/>
  </form>;
}
