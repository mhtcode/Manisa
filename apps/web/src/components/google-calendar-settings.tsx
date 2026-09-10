"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarPlus, Check, KeyRound, LoaderCircle, Plus } from "lucide-react";
import { addGoogleCalendars, listAvailableGoogleCalendars, saveGoogleCalendarCredentials, type CalendarActionResult, type CalendarOption } from "@/server/actions/google-calendar";

const initialState: CalendarActionResult = {};

export function GoogleCredentialsForm({ clientId, redirectUri, source, encryptionReady }: { clientId: string; redirectUri: string; source: "database" | "environment" | "none"; encryptionReady: boolean }) {
  const [state, action, pending] = useActionState(saveGoogleCalendarCredentials, initialState);
  return <details className="panel max-w-3xl overflow-hidden" open={source === "none"}>
    <summary className="panel-header cursor-pointer list-none [&::-webkit-details-marker]:hidden"><div className="flex items-center gap-3"><KeyRound className="text-blue-300" size={18}/><div><h2 className="font-semibold">Google OAuth credentials</h2><p className="mt-1 text-xs text-slate-500">{source === "database" ? "Encrypted credentials managed in Manisa" : source === "environment" ? "Currently provided by server environment" : "Not configured"}</p></div></div><span className="text-xs text-blue-300">Configure</span></summary>
    <form action={action} className="grid gap-4 border-t border-white/6 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="label" htmlFor="google-client-id">OAuth web client ID</label><input className="field" defaultValue={clientId} dir="ltr" id="google-client-id" name="clientId" placeholder="…apps.googleusercontent.com" required/></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="google-client-secret">Client secret</label><input autoComplete="new-password" className="field" dir="ltr" id="google-client-secret" name="clientSecret" placeholder={source === "database" ? "Leave blank to keep the encrypted secret" : "Enter the Google client secret"} required={source !== "database"} type="password"/></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="google-redirect-uri">Authorized redirect URI</label><input className="field" defaultValue={redirectUri} dir="ltr" id="google-redirect-uri" name="redirectUri" placeholder="https://your-domain/api/integrations/google-calendar/callback" required type="url"/></div>
      {!encryptionReady && <p className="sm:col-span-2 text-sm text-amber-200">The server owner must set INTEGRATION_ENCRYPTION_KEY before this secret can be saved.</p>}
      {state.error && <p className="sm:col-span-2 text-sm text-rose-300" role="alert">{state.error}</p>}
      {state.success && <p className="sm:col-span-2 flex items-center gap-2 text-sm text-emerald-300" role="status"><Check size={15}/>{state.success}</p>}
      <div className="sm:col-span-2 flex justify-end"><button className="button" disabled={pending || !encryptionReady}>{pending ? <LoaderCircle className="animate-spin" size={16}/> : <KeyRound size={16}/>}Save encrypted credentials</button></div>
    </form>
  </details>;
}

export function GoogleCalendarSelector({ connectionId }: { connectionId: string }) {
  const [calendars, setCalendars] = useState<CalendarOption[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<CalendarActionResult>({});
  const [pending, startTransition] = useTransition();

  function load() {
    setMessage({});
    startTransition(async () => {
      const result = await listAvailableGoogleCalendars(connectionId);
      setCalendars(result.calendars || []);
      setMessage(result);
    });
  }

  function add() {
    setMessage({});
    startTransition(async () => {
      const result = await addGoogleCalendars(connectionId, selected);
      setMessage(result);
      if (result.success) { setCalendars(null); setSelected([]); }
    });
  }

  if (calendars === null) return <div><button className="button-secondary" disabled={pending} onClick={load} type="button">{pending ? <LoaderCircle className="animate-spin" size={15}/> : <CalendarPlus size={15}/>}Choose more calendars</button>{message.error && <p className="mt-2 text-xs text-rose-300">{message.error}</p>}</div>;
  return <div className="rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/8">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Calendars owned by this account</p><button className="text-xs text-slate-400 hover:text-white" onClick={() => setCalendars(null)} type="button">Close</button></div>
    <div className="mt-3 space-y-2">{calendars.map((calendar) => <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.035]" key={calendar.id}><input checked={selected.includes(calendar.id)} className="size-4 accent-teal-300" onChange={(event) => setSelected((current) => event.target.checked ? [...current, calendar.id] : current.filter((id) => id !== calendar.id))} type="checkbox"/><span className="min-w-0 flex-1 truncate text-sm" dir="auto">{calendar.name}</span>{calendar.primary && <span className="text-[10px] text-slate-500">Primary</span>}</label>)}{!calendars.length && <p className="py-3 text-sm text-slate-500">Every owned calendar from this account is already connected.</p>}</div>
    {message.error && <p className="mt-3 text-xs text-rose-300">{message.error}</p>}
    {message.success && <p className="mt-3 text-xs text-emerald-300">{message.success}</p>}
    <button className="button mt-4" disabled={pending || !selected.length} onClick={add} type="button">{pending ? <LoaderCircle className="animate-spin" size={15}/> : <Plus size={15}/>}Add selected</button>
  </div>;
}
