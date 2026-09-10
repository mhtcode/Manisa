import Link from "next/link";
import { CalendarCheck2, CheckCircle2, RefreshCw, SearchCheck, ShieldCheck, Unplug } from "lucide-react";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { GoogleCalendarSelector, GoogleCredentialsForm } from "@/components/google-calendar-settings";
import { PageHeading } from "@/components/page-heading";
import { requireBusinessPermission } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { checkGoogleCalendar, disconnectGoogleCalendar, retryGoogleCalendar, synchronizeGoogleCalendar } from "@/server/actions/google-calendar";

const notices: Record<string, string> = { connected: "Google account connected. Its primary calendar was queued for synchronization." };
const errors: Record<string, string> = { config: "Save valid Google OAuth credentials before connecting an account.", state: "The authorization request expired or could not be verified.", cancelled: "Google authorization was cancelled.", token: "Google did not provide offline access. Reconnect and approve access.", scope: "Calendar event and calendar-list access were not granted.", account: "The selected Google account could not be verified.", oauth: "Google Calendar could not be connected." };

export default async function GoogleCalendarSettings({ searchParams }: { searchParams: Promise<{ success?: string; error?: string; queued?: string }> }) {
  const [query] = await Promise.all([searchParams, requireBusinessPermission("integrations.manage")]);
  const [credential, connections, groupedJobs] = await Promise.all([
    prisma.googleCalendarCredential.findUnique({ where: { id: "google-calendar" }, select: { clientId: true, redirectUri: true } }),
    prisma.googleCalendarConnection.findMany({ orderBy: [{ googleAccountEmail: "asc" }, { primary: "desc" }, { calendarName: "asc" }] }),
    prisma.googleCalendarSyncJob.groupBy({ by: ["connectionId", "status"], _count: true }),
  ]);
  const env = getServerEnv();
  const fallbackConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALENDAR_REDIRECT_URI);
  const configured = Boolean(credential || fallbackConfigured) && Boolean(env.INTEGRATION_ENCRYPTION_KEY);
  const clientId = credential?.clientId || env.GOOGLE_CLIENT_ID || "";
  const redirectUri = credential?.redirectUri || env.GOOGLE_CALENDAR_REDIRECT_URI || "";
  const source = credential ? "database" as const : fallbackConfigured ? "environment" as const : "none" as const;
  const jobCount = (id: string, statuses: string[]) => groupedJobs.filter((item) => item.connectionId === id && statuses.includes(item.status)).reduce((sum, item) => sum + item._count, 0);
  const accounts = Array.from(new Map(connections.map((item) => [item.googleAccountEmail, item])).values());

  return <>
    <PageHeading backHref="/settings" title="Google Calendar" actions={configured ? <Link className="button" href="/api/integrations/google-calendar/connect"><CalendarCheck2 size={16}/>Connect Google account</Link> : undefined}/>
    {query.success && notices[query.success] && <div className="mb-5 rounded-xl bg-emerald-300/[0.06] px-4 py-3 text-sm text-emerald-200 ring-1 ring-emerald-300/15">{notices[query.success]}{query.queued ? ` ${query.queued} queued.` : ""}</div>}
    {query.error && errors[query.error] && <div className="mb-5 rounded-xl bg-rose-300/[0.06] px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-300/15">{errors[query.error]}</div>}
    <div className="space-y-5">
      <GoogleCredentialsForm clientId={clientId} encryptionReady={Boolean(env.INTEGRATION_ENCRYPTION_KEY)} redirectUri={redirectUri} source={source}/>
      {!configured && <section className="panel max-w-3xl p-5 sm:p-6"><ShieldCheck className="text-amber-200" size={21}/><h2 className="mt-4 font-semibold">Complete credentials first</h2><p className="mt-2 text-sm leading-6 text-slate-400">Create a Google OAuth Web application, enter its client ID and secret above, and use the exact HTTPS callback shown in that form.</p></section>}
      {connections.map((connection) => {
        const pending = jobCount(connection.id, ["PENDING", "PROCESSING"]);
        const failed = jobCount(connection.id, ["FAILED"]);
        return <section className="panel max-w-3xl overflow-hidden" key={connection.id}>
          <div className="panel-header"><div className="flex min-w-0 items-center gap-3"><CalendarCheck2 className="shrink-0 text-blue-300" size={20}/><div className="min-w-0"><h2 className="truncate font-semibold" dir="auto">{connection.calendarName}</h2><p className="truncate text-xs text-slate-500">{connection.googleAccountEmail}{connection.primary ? " · Primary" : ""}</p></div></div><span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs ${connection.status === "CONNECTED" ? "bg-emerald-300/10 text-emerald-300" : "bg-amber-300/10 text-amber-200"}`}><CheckCircle2 size={13}/>{connection.status === "CONNECTED" ? "Connected" : "Reconnect"}</span></div>
          <dl className="grid gap-4 p-5 sm:grid-cols-4"><div><dt className="text-xs text-slate-500">Pending</dt><dd className="mt-1 text-lg font-semibold">{pending}</dd></div><div><dt className="text-xs text-slate-500">Failed</dt><dd className="mt-1 text-lg font-semibold">{failed}</dd></div><div><dt className="text-xs text-slate-500">Last sync</dt><dd className="mt-1 text-xs leading-5">{connection.lastSuccessfulSyncAt?.toLocaleString("en-CA") || "Not yet"}</dd></div><div><dt className="text-xs text-slate-500">Last checked</dt><dd className="mt-1 text-xs leading-5">{connection.lastCheckedAt?.toLocaleString("en-CA") || "Not checked"}</dd></div>{connection.lastError && <div className="rounded-xl bg-rose-300/[0.04] p-3 text-sm text-rose-200 ring-1 ring-rose-300/10 sm:col-span-4">{connection.lastError}</div>}</dl>
          <div className="flex flex-wrap gap-2 border-t border-white/6 p-5"><form action={checkGoogleCalendar.bind(null, connection.id)}><button className="button-secondary"><SearchCheck size={15}/>Check connection</button></form><form action={synchronizeGoogleCalendar.bind(null, connection.id)}><button className="button-secondary"><RefreshCw size={15}/>Sync now</button></form>{failed > 0 && <form action={retryGoogleCalendar.bind(null, connection.id)}><button className="button-secondary"><RefreshCw size={15}/>Retry {failed}</button></form>}<ConfirmActionForm action={disconnectGoogleCalendar.bind(null, connection.id)} className="button-danger sm:ms-auto" message={`Disconnect ${connection.calendarName}? Existing Google events remain, but Manisa will stop updating this calendar.`}><Unplug size={15}/>Disconnect</ConfirmActionForm></div>
        </section>;
      })}
      {accounts.map((connection) => <div className="max-w-3xl" key={`picker-${connection.googleAccountEmail}`}><GoogleCalendarSelector connectionId={connection.id}/></div>)}
      {configured && !connections.length && <section className="panel max-w-3xl p-6 text-center"><CalendarCheck2 className="mx-auto text-blue-300" size={27}/><h2 className="mt-4 font-semibold">No calendars connected</h2><p className="mt-2 text-sm text-slate-400">Connect a Google account, then choose any additional owned calendars you want Manisa to maintain.</p><Link className="button mt-5" href="/api/integrations/google-calendar/connect">Connect Google account</Link></section>}
    </div>
  </>;
}
