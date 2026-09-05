"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { inviteBusinessMember, type InvitationState } from "@/server/actions/platform";

export function MemberInvitationForm() {
  const [state, action, pending] = useActionState<InvitationState, FormData>(inviteBusinessMember, {});
  const [copied, setCopied] = useState(false);
  const invitationUrl = state.link || "";

  async function copyLink() {
    const absolute = new URL(invitationUrl, window.location.origin).toString();
    await navigator.clipboard.writeText(absolute);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
    <input className="input min-w-0" name="email" placeholder="admin@example.com" required type="email"/>
    <select className="input" name="role"><option value="ADMIN">Admin</option><option value="STAFF">Staff</option></select>
    <button className="button" disabled={pending}>{pending ? "Creating…" : "Invite"}</button>
    {state.error ? <p className="text-sm text-rose-300 sm:col-span-3">{state.error}</p> : null}
    {state.link ? <div aria-live="polite" className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.055] px-3 py-2 sm:col-span-3"><p className="min-w-0 text-sm text-emerald-200">{copied ? "Invitation link copied" : "Invitation ready"}</p><button aria-label="Copy invitation link" className="icon-button size-9 shrink-0" onClick={copyLink} title="Copy invitation link" type="button">{copied ? <Check size={16}/> : <Copy size={16}/>}</button></div> : null}
  </form>;
}
