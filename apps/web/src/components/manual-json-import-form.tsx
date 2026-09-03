"use client";

import { useActionState } from "react";
import { AlertTriangle, Braces, CheckCircle2, FileJson2, LoaderCircle } from "lucide-react";
import { importManualCalendarJson, type CalendarImportState } from "@/server/actions/settings";

const initialState: CalendarImportState = { status: "idle" };
const example = `{
  "appointments": [
    {
      "externalId": "old-booking-001",
      "startAt": "2026-08-20T14:00:00-04:00",
      "customer": {
        "name": "Sara Ahmadi",
        "phone": "+1 416 555 0199",
        "preferredLanguage": "fa"
      },
      "services": [
        {
          "name": "Gel manicure",
          "category": { "name": "Nails", "icon": "nail", "accentColor": "#60A5FA" },
          "durationMinutes": 60,
          "price": 75,
          "color": "Rose"
        }
      ],
      "notes": "Imported from the previous calendar"
    }
  ]
}`;

export function ManualJsonImportForm() {
  const [state, action, pending] = useActionState(importManualCalendarJson, initialState);
  return <section className="panel overflow-hidden">
    <div className="panel-header"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300"><Braces size={19}/></span><div><h2 className="font-semibold text-white">JSON batch import</h2><p className="mt-1 text-xs text-slate-500">Create missing categories, services, customers, and appointments in one transaction.</p></div></div><span className="badge border-blue-300/20 bg-blue-300/8 text-blue-200">Up to 200</span></div>
    <form action={action} className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_.85fr]">
      <div className="space-y-4">
        <div><label className="label" htmlFor="jsonFile">JSON file (optional)</label><input accept=".json,application/json" className="field file:me-3 file:rounded-lg file:border-0 file:bg-white/8 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-200" id="jsonFile" name="jsonFile" type="file"/></div>
        <div><label className="label" htmlFor="jsonText">Or paste JSON</label><textarea className="field min-h-64 resize-y font-mono text-xs leading-5" id="jsonText" name="jsonText" placeholder={example}/></div>
        <p className="text-xs leading-5 text-slate-500">The entire batch is validated first. If any row is invalid or saving fails, nothing is created. Reusing an <code>externalId</code> safely skips that appointment.</p>
        {state.status !== "idle" && <div className={`rounded-xl border p-3.5 text-sm ${state.status === "success" ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100" : "border-rose-300/20 bg-rose-300/[0.06] text-rose-100"}`} role="status"><div className="flex items-start gap-2">{state.status === "success" ? <CheckCircle2 className="mt-0.5 shrink-0" size={17}/> : <AlertTriangle className="mt-0.5 shrink-0" size={17}/>}<div><p className="font-medium">{state.message}</p>{state.status === "success" && <p className="mt-1 text-xs opacity-75">{state.imported || 0} imported · {state.duplicates || 0} duplicates</p>}{state.issues?.map((issue) => <p className="mt-1 text-xs opacity-75" key={issue}>{issue}</p>)}</div></div></div>}
        <button className="button" disabled={pending} type="submit">{pending ? <LoaderCircle className="animate-spin" size={17}/> : <FileJson2 size={17}/>} {pending ? "Importing batch…" : "Import JSON batch"}</button>
      </div>
      <div className="min-w-0 rounded-2xl border border-white/8 bg-[#080c12] p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Accepted format</p><pre className="mt-3 max-h-[34rem] overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-300" dir="ltr">{example}</pre></div>
    </form>
  </section>;
}
