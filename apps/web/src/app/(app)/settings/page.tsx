import Link from "next/link";
import { CalendarClock, CalendarSync, ChevronRight, GitFork, Images, Instagram, Layers3, LogOut, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, SwatchBook, Trash2, UserRound, UsersRound, WalletCards, UserCog } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logout } from "@/server/actions/auth";
import { hasBusinessPermission, type BusinessPermission } from "@/lib/permissions";

const groups = [
  {
    title: "Manage",
    items: [
      ["/appointments", "Appointments", "Schedule, confirm, finalize, and review visits", CalendarClock],
      ["/customers", "Customers", "Profiles, visit history, preferences, and insights", UsersRound],
      ["/settings/referrals", "Customer referrals", "Filter and explore the complete referral graph", GitFork],
      ["/services", "Services", "Pricing, duration, colors, and performance", SwatchBook],
      ["/settings/categories", "Categories", "Create, reorder, archive, and organize studio areas", Layers3],
      ["/gallery", "Gallery", "Organize visit photos and choose featured work", Images],
    ],
  },
  {
    title: "Settings",
    items: [
      ["/settings/financial", "Financial", "Payments, methods, balances, and collections", WalletCards],
      ["/settings/business", "Studio profile & appearance", "Name, language, currency, timezone, and theme", SlidersHorizontal],
      ["/settings/navigation", "Navigation", "Choose and reorder the four mobile destinations", Settings2],
      ["/settings/calendar-import", "Calendar import", "Bring earlier calendar or JSON appointments into Manisa", CalendarSync],
      ["/settings/google-calendar", "Google Calendar", "One-way appointment synchronization", CalendarSync],
      ["/settings/instagram", "Instagram", "Connect a Professional account and refresh public posts", Instagram],
      ["/settings/security", "Profile & security", "Administrator identity, access, and session details", ShieldCheck],
      ["/settings/members", "Members", "Invite and manage this business team", UserCog],
      ["/settings/trash", "Trash", "Restore deleted items for seven days or erase them now", Trash2],
    ],
  },
] as const;

const contextualDestinations = new Set(["/appointments", "/customers", "/services", "/gallery"]);
const requiredPermission: Record<string, BusinessPermission> = {
  "/appointments": "appointments.view", "/customers": "customers.view", "/settings/referrals": "customers.view", "/services": "services.view",
  "/settings/categories": "services.manage", "/gallery": "gallery.view", "/settings/financial": "financial.view", "/settings/business": "business.manage",
  "/settings/navigation": "business.manage", "/settings/calendar-import": "appointments.manage", "/settings/instagram": "integrations.manage",
  "/settings/google-calendar": "integrations.manage",
  "/settings/members": "members.manage", "/settings/trash": "trash.manage",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const categoryCount = await prisma.studioCategory.count({ where: { businessId: user.businessId, active: true, deletedAt: null } });
  return <>
    <PageHeading title="Settings"/>
    <section className="mb-5 overflow-hidden rounded-[1.35rem] border border-blue-400/15 bg-gradient-to-br from-[#13223e] to-[#0c1423] p-5 shadow-[0_18px_50px_rgba(0,0,0,.25)] sm:p-6">
      <div className="flex items-center gap-4"><span className="flex size-14 items-center justify-center rounded-full border border-blue-300/20 bg-blue-400/10 text-blue-200"><UserRound size={24}/></span><div className="min-w-0"><h2 className="truncate text-lg font-semibold text-white">{user.name}</h2><p className="mt-1 truncate text-sm text-slate-400">{user.email}</p><p className="mt-2 text-xs text-blue-300">Administrator · {categoryCount} active {categoryCount === 1 ? "category" : "categories"}</p></div></div>
    </section>
    <div className="space-y-5">
      {groups.map((group) => { const visibleItems = group.items.filter(([href]) => !requiredPermission[href] || user.elevated || hasBusinessPermission(user.membership.role, user.membership.permissionOverrides, requiredPermission[href])); return visibleItems.length ? <section key={group.title}><h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-[.16em] text-slate-500">{group.title}</h2><div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d131d] shadow-[0_16px_40px_rgba(0,0,0,.16)]">{visibleItems.map(([href, label, , Icon], index) => <Link className={`group flex items-center gap-3 px-4 py-3.5 transition hover:bg-blue-500/[0.07] active:bg-blue-500/[0.12] sm:px-5 ${index ? "border-t border-white/8" : ""}`} href={contextualDestinations.has(href) ? `${href}?from=settings` : href} key={href}><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/12 bg-blue-500/8 text-blue-300"><Icon size={18}/></span><span className="min-w-0 flex-1 text-sm font-semibold text-slate-100">{label}</span><ChevronRight className="shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-blue-300 rtl:rotate-180" size={18}/></Link>)}</div></section> : null; })}
    </div>
    <form action={logout} className="mt-5"><button className="flex w-full items-center gap-3 rounded-2xl border border-rose-400/15 bg-rose-500/[0.045] px-4 py-3.5 text-start text-sm font-semibold text-rose-200 transition active:scale-[.99] active:bg-rose-500/10 sm:px-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10"><LogOut size={18}/></span><span className="flex-1">Sign out</span><ChevronRight className="shrink-0 opacity-45 rtl:rotate-180" size={18}/></button></form>
    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600"><Sparkles size={13}/>Manisa studio management</div>
  </>;
}
