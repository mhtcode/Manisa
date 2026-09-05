"use client";
import { useActionState } from "react";
import { setupPlatform, type SetupState } from "@/server/actions/platform";
import { PasswordCreationFields } from "@/components/password-creation-fields";

export function SetupForm() {
  const [state, action, pending] = useActionState<SetupState, FormData>(setupPlatform, {});
  return <form action={action} className="mt-7 space-y-4">
    <label className="block text-sm">Setup token<input className="input mt-2" name="setupToken" required type="password"/></label>
    <label className="block text-sm">Your name<input className="input mt-2" name="name" required/></label>
    <label className="block text-sm">Email<input className="input mt-2" name="email" required type="email"/></label>
    <PasswordCreationFields/>
    <label className="block text-sm">First business<input className="input mt-2" defaultValue="Manisa" name="businessName" required/></label>
    {state.error ? <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{state.error}</p> : null}
    <button className="button w-full" disabled={pending}>{pending ? "Creating platform…" : "Create platform owner"}</button>
  </form>;
}
