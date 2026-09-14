import { BellRing, Building2, ChevronDown, Navigation, ShieldCheck } from "lucide-react";
import { MobileNavigationSettings } from "@/components/mobile-navigation-settings";
import { PageHeading } from "@/components/page-heading";
import { PasswordChangeForm } from "@/components/password-change-form";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import { StudioSettingsForm } from "@/components/studio-settings-form";
import { requireUser } from "@/lib/auth";
import { parseMobileNavigation } from "@/lib/mobile-navigation";
import { hasBusinessPermission } from "@/lib/permissions";

export default async function BusinessSettingsPage() {
  const user = await requireUser();
  const settings = user.settings;
  const canManageBusiness = hasBusinessPermission(user.role, user.permissionOverrides, "business.manage");
  return <><PageHeading backHref="/settings" title="Business, security & navigation" description="Manage studio identity, your account, notifications, and mobile navigation in one place."/><div className="mx-auto max-w-4xl space-y-3">
    {canManageBusiness && <SettingsSection icon={Building2} id="business" open title="Studio profile & appearance"><StudioSettingsForm settings={settings}/></SettingsSection>}
    <SettingsSection icon={ShieldCheck} id="security" title="Profile & security"><div className="grid gap-4 xl:grid-cols-2"><section className="panel p-5 sm:p-6"><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="text-xs text-slate-600">Name</dt><dd className="mt-1.5 text-sm text-slate-200">{user.name}</dd></div><div><dt className="text-xs text-slate-600">Role</dt><dd className="mt-1.5 text-sm capitalize text-slate-200">{user.role.toLowerCase()}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-600">Email</dt><dd className="mt-1.5 text-sm text-slate-200">{user.email}</dd></div></dl></section><PasswordChangeForm/></div></SettingsSection>
    <SettingsSection icon={BellRing} id="notifications" title="Mobile notifications"><PushNotificationSettings/></SettingsSection>
    <SettingsSection icon={Navigation} id="navigation" title="Mobile navigation"><MobileNavigationSettings initialOrder={parseMobileNavigation(settings?.mobileNavOrder)}/></SettingsSection>
  </div></>;
}

function SettingsSection({ icon: Icon, id, title, open, children }: { icon: typeof Building2; id: string; title: string; open?: boolean; children: React.ReactNode }) {
  return <details className="group panel overflow-hidden" id={id} open={open}><summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-300"><Icon size={17}/></span><strong className="min-w-0 flex-1 text-sm font-semibold">{title}</strong><ChevronDown className="shrink-0 text-slate-500 transition group-open:rotate-180" size={17}/></summary><div className="border-t border-white/7 p-3 sm:p-4">{children}</div></details>;
}
