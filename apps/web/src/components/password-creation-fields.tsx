"use client";

import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { passwordRequirements } from "@/lib/password-policy";

export function PasswordCreationFields({ passwordLabel = "Password", confirmLabel = "Confirm password" }: { passwordLabel?: string; confirmLabel?: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const matches = confirmation.length > 0 && password === confirmation;
  return <>
    <label className="block text-sm text-slate-300">{passwordLabel}<input autoComplete="new-password" className="input mt-2" maxLength={128} minLength={10} name="password" onChange={(event) => setPassword(event.target.value)} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}" required type="password" value={password}/></label>
    <div aria-live="polite" className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-2xl border border-white/8 bg-white/[.018] p-3">{passwordRequirements.map((requirement) => { const passed = requirement.test(password); return <span className={`flex items-center gap-1.5 text-[11px] ${passed ? "text-emerald-300" : "text-slate-500"}`} key={requirement.key}>{passed ? <Check size={13}/> : <Circle size={10}/>} {requirement.label}</span>; })}</div>
    <label className="block text-sm text-slate-300">{confirmLabel}<input aria-invalid={confirmation.length > 0 && !matches} autoComplete="new-password" className="input mt-2" maxLength={128} minLength={10} name="passwordConfirmation" onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation}/><span className={`mt-1.5 block text-[11px] ${matches ? "text-emerald-300" : confirmation ? "text-rose-300" : "text-slate-600"}`}>{matches ? "Passwords match" : confirmation ? "Passwords do not match" : "Enter the password again"}</span></label>
  </>;
}
