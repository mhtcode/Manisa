import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CalendarImportForm } from "@/components/calendar-import-form";
import { PageHeading } from "@/components/page-heading";
import { googleCalendarConfigured } from "@/lib/env";

export default function CalendarImportSettingsPage() {
  const configured = googleCalendarConfigured();
  return <><PageHeading title="Calendar import" description="Import historical Google Calendar records without adding them to revenue reports." actions={<Link className="button-secondary" href="/settings"><ArrowLeft size={16}/>Settings</Link>}/><div className="space-y-5"><section className="panel p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-medium">Google Calendar</h2><span className={`badge ${configured ? "border-amber-400/20 bg-amber-400/10 text-amber-300" : "border-white/10 text-slate-500"}`}>{configured ? "Credentials found" : "File import ready"}</span></div><p className="mt-3 text-sm leading-6 text-slate-500">Historical file import works without a live Google connection. Imported unknown services are safely placed in Other services.</p></section><CalendarImportForm/></div></>;
}
