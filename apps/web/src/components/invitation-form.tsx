"use client";
import { useActionState } from "react";
import { acceptInvitation, type SetupState } from "@/server/actions/platform";

export function InvitationForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(acceptInvitation, {});
  return <><form action={action} className="mt-6 space-y-4"><input name="token" type="hidden" value={token}/><label className="block text-sm">Email<input className="input mt-2" disabled value={email}/></label><label className="block text-sm">Name<input className="input mt-2" name="name" required/></label><label className="block text-sm">Create password<input className="input mt-2" minLength={10} name="password" required type="password"/></label>{state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}<button className="button w-full" disabled={pending}>{pending ? "Joining…" : "Accept invitation"}</button></form><a className="button-secondary mt-3 w-full" href={`/api/auth/google/connect?invite=${encodeURIComponent(token)}`}>Continue with Google</a></>;
}
