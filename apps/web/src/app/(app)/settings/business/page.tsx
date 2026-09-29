import Link from "next/link";
import { ArrowRight, BellRing, Building2, Contact, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";
import { hasBusinessPermission } from "@/lib/permissions";

const businessLinks = [
  { href: "/settings/business/identity", title: "Studio identity", icon: Building2, permission: true },
  { href: "/settings/business/public-profile", title: "Public profile", icon: MapPin, permission: true },
  { href: "/settings/business/contact", title: "Contact & booking", icon: Contact, permission: true },
  { href: "/settings/security", title: "Profile & security", icon: ShieldCheck, permission: false },
  { href: "/settings/notifications", title: "Mobile notifications", icon: BellRing, permission: false },
  { href: "/settings/navigation", title: "Mobile navigation", icon: Navigation, permission: false },
] as const;

export default async function BusinessSettingsPage() {
  const user = await requireUser();
  const canManageBusiness = hasBusinessPermission(user.role, user.permissionOverrides, "business.manage");
  return <><PageHeading backHref="/settings" title="Business, security & navigation"/><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {businessLinks.filter((item) => !item.permission || canManageBusiness).map(({ href, title, icon: Icon }) => <Link className="panel group flex min-h-24 items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-blue-300/30 hover:bg-blue-500/[0.06]" href={href} key={href}><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-500/12 text-blue-200"><Icon size={20}/></span><strong className="min-w-0 flex-1 truncate text-base font-semibold">{title}</strong><ArrowRight className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-blue-200" size={18}/></Link>)}
  </section></>;
}
