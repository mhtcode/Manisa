"use client";

import { useState } from "react";
import { CustomerReferralPicker, type ReferralOption } from "@/components/customer-referral-picker";
import { WizardNavigation, WizardProgress } from "@/components/form-wizard";

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
  action: (data: FormData) => void | Promise<void>;
  customer?: CustomerValue;
  referralOptions: ReferralOption[];
}) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState(customer?.firstName || "");
  return <form action={action} className="panel mx-auto max-w-3xl p-5 sm:p-7">
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
    </section>
    <WizardNavigation canContinue={step !== 0 || firstName.trim().length > 0} cancelHref="/customers" count={steps.length} current={step} onBack={() => setStep((value) => Math.max(0, value - 1))} onNext={() => setStep((value) => Math.min(steps.length - 1, value + 1))} submitLabel="Save customer"/>
  </form>;
}
