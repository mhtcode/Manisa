import Link from "next/link";
import { ArrowRight, CalendarSync, Instagram } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requireBusinessPermission } from "@/lib/auth";

const integrations = [
  { href: "/settings/google-calendar", title: "Google Calendar", description: "Credentials, accounts, calendars, and synchronization", icon: CalendarSync },
  { href: "/settings/instagram", title: "Instagram", description: "Credentials, account connection, and cached public posts", icon: Instagram },
];

export default async function IntegrationsSettingsPage() {
  await requireBusinessPermission("integrations.manage");
  return <><PageHeading backHref="/settings" title="Connected services" description="Open a service to configure it on its own page."/><section className="grid gap-3 sm:grid-cols-2">{integrations.map(({ href, title, description, icon: Icon }) => <Link className="panel group flex min-h-28 items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-blue-300/30 hover:bg-blue-500/[0.06]" href={href} key={href}><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-500/12 text-blue-200"><Icon size={20}/></span><span className="min-w-0 flex-1"><strong className="block text-base font-semibold">{title}</strong><span className="mt-1 block text-sm leading-5 text-slate-400">{description}</span></span><ArrowRight className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-blue-200" size={18}/></Link>)}</section></>;
}
