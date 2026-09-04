"use client";

import { useActionState, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
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
    <select className="input" name="role"><option value="ADMIN">Admin</option><option value="MANAGER">Manager</option><option value="STAFF">Staff</option></select>
    <button className="button" disabled={pending}>{pending ? "Creating…" : "Invite"}</button>
    {state.error ? <p className="text-sm text-rose-300 sm:col-span-3">{state.error}</p> : null}
    {state.link ? <div className="flex min-w-0 items-center gap-2 rounded-xl border border-blue-300/20 bg-blue-500/10 p-2 sm:col-span-3"><a className="min-w-0 flex-1 truncate px-2 text-sm text-blue-200 hover:text-white" href={state.link} target="_blank">{state.link}</a><button aria-label="Copy invitation link" className="icon-button size-9 shrink-0" onClick={copyLink} title="Copy invitation link" type="button">{copied ? <Check size={16}/> : <Copy size={16}/>}</button><a aria-label="Open invitation" className="icon-button size-9 shrink-0" href={state.link} target="_blank" title="Open invitation"><ExternalLink size={16}/></a></div> : null}
  </form>;
}
