import { CalendarSync, ChevronDown, Instagram } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requireBusinessPermission } from "@/lib/auth";
import { GoogleCalendarSettingsContent } from "../google-calendar/page";
import { InstagramSettingsContent } from "../instagram/page";

type Query = { section?: string; success?: string; error?: string; queued?: string };

export default async function IntegrationsSettingsPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireBusinessPermission("integrations.manage");
  const query = await searchParams;
  return <><PageHeading backHref="/settings" title="Connected services" description="Manage calendar and social connections from one place."/><div className="space-y-3">
    <IntegrationSection icon={CalendarSync} open={query.section !== "instagram"} title="Google Calendar"><GoogleCalendarSettingsContent embedded searchParams={Promise.resolve(query)}/></IntegrationSection>
    <IntegrationSection icon={Instagram} open={query.section === "instagram"} title="Instagram"><InstagramSettingsContent embedded searchParams={Promise.resolve(query)}/></IntegrationSection>
  </div></>;
}

function IntegrationSection({ icon: Icon, open, title, children }: { icon: typeof CalendarSync; open?: boolean; title: string; children: React.ReactNode }) {
  return <details className="group panel overflow-hidden" open={open}><summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-300"><Icon size={17}/></span><strong className="min-w-0 flex-1 text-sm font-semibold">{title}</strong><ChevronDown className="text-slate-500 transition group-open:rotate-180" size={17}/></summary><div className="border-t border-white/7 p-3 sm:p-5">{children}</div></details>;
}
