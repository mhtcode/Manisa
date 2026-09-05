"use client";
import { useActionState } from "react";
import { acceptInvitation, type SetupState } from "@/server/actions/platform";
import { PasswordCreationFields } from "@/components/password-creation-fields";

export function InvitationForm({ token, email, existingPasswordAccount }: { token: string; email: string; existingPasswordAccount: boolean }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(acceptInvitation, {});
  return <><form action={action} className="mt-6 space-y-4"><input name="token" type="hidden" value={token}/><label className="block text-sm text-slate-300">Email<input className="input mt-2" disabled value={email}/></label><label className="block text-sm text-slate-300">Name<input autoComplete="name" className="input mt-2" name="name" required/></label>{existingPasswordAccount ? <label className="block text-sm text-slate-300">Current password<input autoComplete="current-password" className="input mt-2" name="password" required type="password"/></label> : <PasswordCreationFields/>}{state.error ? <p className="rounded-xl border border-rose-300/15 bg-rose-400/[0.06] p-3 text-sm text-rose-300">{state.error}</p> : null}<button className="button w-full" disabled={pending}>{pending ? "Joining…" : "Accept invitation"}</button></form><div className="my-4 flex items-center gap-3 text-xs text-slate-600"><span className="h-px flex-1 bg-white/8"/>or<span className="h-px flex-1 bg-white/8"/></div><a className="button-secondary w-full" href={`/api/auth/google/connect?invite=${encodeURIComponent(token)}`}>Continue with Google</a></>;
}
