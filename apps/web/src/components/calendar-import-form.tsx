"use client";

import { useActionState } from "react";
import { AlertTriangle, CalendarArrowDown, CheckCircle2, FileUp, LoaderCircle } from "lucide-react";
import { importGoogleCalendar, type CalendarImportState } from "@/server/actions/settings";

const initialState: CalendarImportState = { status: "idle" };

export function CalendarImportForm() {
  const [state, action, pending] = useActionState(importGoogleCalendar, initialState);
  return <section className="panel overflow-hidden">
    <div className="panel-header"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-violet-300/10 text-violet-300"><CalendarArrowDown size={19}/></span><div><h2 className="font-semibold text-white">Google Calendar file</h2><p className="mt-1 text-xs text-slate-500">Create customers, services, and visits from an exported calendar.</p></div></div><span className="badge border-violet-300/20 bg-violet-300/8 text-violet-200">Manually added</span></div>
    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_.85fr]">
      <form action={action} className="space-y-4">
        <div><label className="label" htmlFor="calendarFile">Google Calendar export (.ics)</label><input accept=".ics,text/calendar" className="field file:me-3 file:rounded-lg file:border-0 file:bg-white/8 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-200 hover:file:bg-white/12" id="calendarFile" name="calendarFile" required type="file"/></div>
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.055] p-3.5 text-xs leading-5 text-amber-100/75"><strong className="font-semibold text-amber-100">Safe reporting:</strong> imported visits receive a “manually added · unreported” tag and zero income. They appear in the calendar but never change revenue or working-hour totals.</div>
        {state.status !== "idle" && <div className={`rounded-xl border p-3.5 text-sm ${state.status === "success" ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100" : "border-rose-300/20 bg-rose-300/[0.06] text-rose-100"}`} role="status"><div className="flex items-start gap-2">{state.status === "success" ? <CheckCircle2 className="mt-0.5 shrink-0" size={17}/> : <AlertTriangle className="mt-0.5 shrink-0" size={17}/>}<div><p className="font-medium">{state.message}</p>{state.status === "success" && <p className="mt-1 text-xs opacity-75">{state.imported || 0} imported · {state.duplicates || 0} duplicates · {state.skipped || 0} skipped</p>}{state.issues?.map((issue) => <p className="mt-1 text-xs opacity-75" key={issue}>{issue}</p>)}</div></div></div>}
        <button className="button" disabled={pending} type="submit">{pending ? <LoaderCircle className="animate-spin" size={17}/> : <FileUp size={17}/>} {pending ? "Importing…" : "Import appointments"}</button>
      </form>
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Required event format</p><p className="mt-3 text-sm leading-6 text-slate-300">Rename each Google Calendar event using a vertical bar:</p><code className="mt-3 block rounded-xl border border-white/8 bg-[#080c12] px-3 py-2.5 text-sm text-teal-200" dir="auto">Customer name | Service name</code><p className="mt-4 text-xs leading-5 text-slate-500">Optional contact details can be added to the event description:</p><code className="mt-2 block whitespace-pre-line rounded-xl border border-white/8 bg-[#080c12] px-3 py-2.5 text-xs leading-5 text-slate-300">Phone: +1 416 555 0100{"\n"}Email: customer@example.com</code><p className="mt-4 text-xs leading-5 text-slate-600">In Google Calendar: Settings → Import & export → Export. Upload the resulting calendar’s .ics file here. Re-importing the same events is safe; duplicates are skipped.</p></div>
    </div>
  </section>;
}
