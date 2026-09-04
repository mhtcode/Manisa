import Link from "next/link";
import { CheckCircle2, ExternalLink, Instagram, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";
import { getServerEnv, instagramConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { disconnectInstagram, refreshInstagram } from "@/server/actions/instagram";

const notices: Record<string, string> = {
  connected: "Instagram connected and the public feed was refreshed.",
  refreshed: "The cached Instagram feed was refreshed.",
  disconnected: "Instagram was disconnected and its cached posts were unpublished.",
};
const errors: Record<string, string> = {
  config: "Complete the server configuration before connecting Instagram.",
  state: "The connection request expired or could not be verified. Please try again.",
  oauth: "Instagram could not authorize this account. Confirm that it is a Professional account and try again.",
  refresh: "The refresh failed. The last successfully cached posts remain available.",
  "not-connected": "Connect Instagram before refreshing it.",
};

export default async function InstagramSettingsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const [query, user] = await Promise.all([searchParams, requireUser()]);
  const [connection, env] = await Promise.all([
    prisma.instagramConnection.findUnique({ where: { userId: user.id }, include: { _count: { select: { posts: { where: { active: true } } } } } }),
    Promise.resolve(getServerEnv()),
  ]);
  const configured = instagramConfigured();
  const missing = [
    !env.INSTAGRAM_APP_ID && "INSTAGRAM_APP_ID",
    !env.INSTAGRAM_APP_SECRET && "INSTAGRAM_APP_SECRET",
    !env.INSTAGRAM_REDIRECT_URI && "INSTAGRAM_REDIRECT_URI",
    env.INSTAGRAM_REDIRECT_URI && !env.INSTAGRAM_REDIRECT_URI.startsWith("https://") && "INSTAGRAM_REDIRECT_URI (must use HTTPS)",
    !env.INTEGRATION_ENCRYPTION_KEY && "INTEGRATION_ENCRYPTION_KEY",
  ].filter(Boolean) as string[];

  return <>
    <PageHeading backHref="/settings" title="Instagram" description="Connect the studio’s Professional account and publish a fast, cached public feed."/>
    {query.success && notices[query.success] && <div className="mb-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-sm text-emerald-200">{notices[query.success]}</div>}
    {query.error && errors[query.error] && <div className="mb-5 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-4 py-3 text-sm text-rose-200">{errors[query.error]}</div>}

    {connection ? <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
      <section className="panel overflow-hidden"><div className="panel-header"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Instagram size={19}/></span><div><h2 className="font-semibold text-white">@{connection.username || connection.instagramUserId}</h2><p className="mt-0.5 text-xs text-slate-500">Instagram Professional account</p></div></div><span className="flex items-center gap-1.5 rounded-full bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-300"><CheckCircle2 size={13}/>Connected</span></div><dl className="grid gap-5 p-5 sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wider text-slate-600">Cached posts</dt><dd className="mt-2 text-lg font-semibold text-white">{connection._count.posts}</dd></div><div><dt className="text-xs uppercase tracking-wider text-slate-600">Last refresh</dt><dd className="mt-2 text-sm text-slate-300">{connection.lastSyncedAt ? connection.lastSyncedAt.toLocaleString("en-CA") : "Not completed"}</dd></div>{connection.lastError && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-rose-300/60">Last refresh issue</dt><dd className="mt-2 rounded-xl border border-rose-300/15 bg-rose-300/[0.04] p-3 text-xs leading-5 text-rose-200/80">{connection.lastError}</dd></div>}</dl><div className="flex flex-wrap gap-2 border-t border-white/8 p-5"><form action={refreshInstagram}><button className="button"><RefreshCw size={15}/>Refresh now</button></form>{connection.username && <a className="button-secondary" href={`https://www.instagram.com/${connection.username}/`} rel="noreferrer" target="_blank"><ExternalLink size={15}/>Open profile</a>}<ConfirmActionForm action={disconnectInstagram} className="button-danger sm:ms-auto" message="Disconnect Instagram and permanently delete its cached posts? This cannot be undone."><Unplug size={15}/>Disconnect</ConfirmActionForm></div></section>
      <section className="panel p-5"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><ShieldCheck size={19}/></span><h2 className="mt-4 font-semibold text-white">Private by design</h2><p className="mt-2 text-sm leading-6 text-slate-400">Manisa requests only <code className="text-blue-200">instagram_business_basic</code>. The access token is encrypted at rest, and the landing page receives cached covers without customer data.</p></section>
    </div> : <section className="panel max-w-3xl overflow-hidden"><div className="panel-header"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Instagram size={19}/></span><div><h2 className="font-semibold text-white">Connect Instagram</h2><p className="mt-0.5 text-xs text-slate-500">Professional Business or Creator accounts</p></div></div></div><div className="p-5 sm:p-6"><p className="text-sm leading-6 text-slate-400">Connecting imports only the latest post covers into Manisa’s cache. Instagram can be disconnected at any time, and the landing-page section stays hidden when the integration is not configured.</p>{missing.length > 0 && <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4"><p className="text-sm font-semibold text-amber-100">Server setup required</p><ul className="mt-2 space-y-1 text-xs text-amber-100/65">{missing.map((name) => <li key={name}>• {name}</li>)}</ul>{env.INSTAGRAM_REDIRECT_URI && <p className="mt-3 break-all text-xs text-slate-500">Callback: {env.INSTAGRAM_REDIRECT_URI}</p>}</div>}<div className="mt-6"><Link aria-disabled={!configured} className={`button ${configured ? "" : "pointer-events-none opacity-45"}`} href="/api/integrations/instagram/connect"><Instagram size={16}/>Connect Professional account</Link></div></div></section>}
  </>;
}
