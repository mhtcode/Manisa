import { CalendarImportForm } from "@/components/calendar-import-form";
import { ManualJsonImportForm } from "@/components/manual-json-import-form";
import { PageHeading } from "@/components/page-heading";
import { googleCalendarConfigured } from "@/lib/env";

export default function CalendarImportSettingsPage() {
  const configured = googleCalendarConfigured();
  return <><PageHeading backHref="/settings" title="Calendar import" description="Import earlier records without adding them to financial reports."/><div className="space-y-5"><section className="panel p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-medium">Import center</h2><span className={`badge ${configured ? "border-amber-400/20 bg-amber-400/10 text-amber-300" : "border-white/10 text-slate-500"}`}>{configured ? "Google credentials found" : "File import ready"}</span></div><p className="mt-3 text-sm leading-6 text-slate-500">Imported appointments are labeled Manually added and stay outside income and working-hour totals.</p></section><ManualJsonImportForm/><CalendarImportForm/></div></>;
}
