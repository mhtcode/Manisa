"use client";

import { useActionState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { PasswordCreationFields } from "@/components/password-creation-fields";
import { changeOwnPassword, type PasswordChangeState } from "@/server/actions/auth";

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState<PasswordChangeState, FormData>(changeOwnPassword, {});
  return <form action={action} className="panel max-w-2xl p-5 sm:p-7">
    <div className="mb-5 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><KeyRound size={18}/></span><h2 className="font-semibold">Change password</h2></div>
    <div className="space-y-4"><label className="block text-sm text-slate-300">Current password<input autoComplete="current-password" className="input mt-2" name="currentPassword" required type="password"/></label><PasswordCreationFields passwordLabel="New password" confirmLabel="Confirm new password"/></div>
    {state.error && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-300">{state.error}</p>}
    {state.success && <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-300">{state.success}</p>}
    <button className="button mt-5" disabled={pending}>{pending && <LoaderCircle className="animate-spin" size={16}/>}Update password</button>
  </form>;
}
