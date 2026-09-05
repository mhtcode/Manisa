"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2, CalendarDays, ChartNoAxesCombined, CircleDollarSign, Images, Layers3, Network, Settings2, ShieldCheck, SwatchBook, Trash2, Upload, UserRoundCog, UsersRound } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n";
import { defaultMobileNavigation, mobileNavigationHrefs, type MobileNavigationKey } from "@/lib/mobile-navigation";
import type { BusinessPermission } from "@/lib/permissions";

const navigationItems = {
  report: ["/report", "report", ChartNoAxesCombined],
  calendar: ["/calendar", "calendar", CalendarDays],
  gallery: ["/gallery", "gallery", Images],
  settings: ["/settings", "settings", Settings2],
  appointments: ["/appointments", "appointments", CalendarCheck2],
  customers: ["/customers", "customers", UsersRound],
  services: ["/services", "services", SwatchBook],
} as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function activeMobileKey(pathname: string, order: MobileNavigationKey[]) {
  const exact = order.find((key) => isActive(pathname, mobileNavigationHrefs[key]));
  if (exact) return exact;
  const managementPage = ["/appointments", "/customers", "/services"].some((href) => isActive(pathname, href));
  return managementPage && order.includes("settings") ? "settings" : null;
}

export function DesktopNavigation({ locale, permissions }: { locale: AppLocale; permissions: BusinessPermission[] }) {
  const pathname = usePathname();
  const t = getMessages(locale);
  const groups = [
    { label: locale === "fa" ? "فضای کاری" : "Workspace", items: [["/report", t.report, ChartNoAxesCombined], ["/calendar", t.calendar, CalendarDays], ["/gallery", t.gallery, Images]] as const },
    { label: locale === "fa" ? "مدیریت" : "Manage", items: [["/appointments", t.appointments, CalendarCheck2], ["/customers", t.customers, UsersRound], ["/services", t.services, SwatchBook], ["/settings/categories", locale === "fa" ? "دسته‌بندی‌ها" : "Categories", Layers3]] as const },
    { label: locale === "fa" ? "مدیریت سیستم" : "Administration", items: [["/settings/financial", locale === "fa" ? "مالی" : "Financial", CircleDollarSign], ["/settings/referrals", locale === "fa" ? "معرفی مشتریان" : "Referrals", Network], ["/settings/members", locale === "fa" ? "اعضا و دسترسی" : "Members & access", UserRoundCog], ["/settings/business", locale === "fa" ? "پروفایل کسب‌وکار" : "Business profile", ShieldCheck], ["/settings/navigation", locale === "fa" ? "ناوبری" : "Navigation", Settings2], ["/settings/calendar-import", locale === "fa" ? "ورود تقویم" : "Calendar import", Upload], ["/settings/google-calendar", "Google Calendar", CalendarCheck2], ["/settings/instagram", "Instagram", Images], ["/settings/security", locale === "fa" ? "امنیت" : "Security", ShieldCheck], ["/settings/trash", locale === "fa" ? "زباله‌دان" : "Trash", Trash2], ["/settings", t.settings, Settings2]] as const },
  ];
  const routePermission: Record<string, BusinessPermission> = { "/report": "reports.view", "/calendar": "appointments.view", "/gallery": "gallery.view", "/appointments": "appointments.view", "/customers": "customers.view", "/services": "services.view", "/settings/categories": "services.manage", "/settings/financial": "financial.view", "/settings/referrals": "customers.view", "/settings/members": "members.manage", "/settings/business": "business.manage", "/settings/navigation": "business.manage", "/settings/calendar-import": "appointments.manage", "/settings/google-calendar": "integrations.manage", "/settings/instagram": "integrations.manage", "/settings/trash": "trash.manage" };
  return <nav aria-label="Main navigation" className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto pe-1">
    {groups.map((group) => { const visibleItems = group.items.filter(([href]) => !routePermission[href] || permissions.includes(routePermission[href])); return visibleItems.length ? <section key={group.label}><p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-700">{group.label}</p><div className="space-y-0.5">{visibleItems.map(([href, label, Icon]) => {
      const active = href === "/settings" ? pathname === href : isActive(pathname, href);
      return <Link aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${active ? "border-blue-400/25 bg-blue-500/10 font-medium text-blue-100" : "border-transparent text-slate-400 hover:bg-white/[0.05] hover:text-white"}`} href={href} key={href} prefetch={false}><Icon className={active ? "text-blue-300" : "text-slate-500 group-hover:text-slate-300"} size={17}/><span className="truncate">{label}</span>{active && <span className="ms-auto size-1.5 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,.75)]"/>}</Link>;
    })}</div></section> : null; })}
  </nav>;
}

export function MobileNavigation({ locale, order = defaultMobileNavigation }: { locale: AppLocale; order?: MobileNavigationKey[] }) {
  const pathname = usePathname();
  const t = getMessages(locale);
  const activeKey = activeMobileKey(pathname, order);
  return <nav aria-label="Mobile navigation" className="mobile-glass-nav fixed inset-x-3 z-50 grid grid-cols-4 p-1.5 md:hidden" data-swipe-lock>
    {order.map((key) => {
      const [href, messageKey, Icon] = navigationItems[key];
      const active = activeKey === key;
      return <Link aria-current={active ? "page" : undefined} aria-label={t[messageKey]} className={`mobile-nav-item relative flex min-h-[3.55rem] min-w-0 flex-col items-center justify-center gap-1 rounded-[1.15rem] px-1 py-1.5 transition ${active ? "mobile-nav-item-active text-blue-50" : "text-slate-400 active:bg-white/[0.065]"}`} href={href} key={key} prefetch={false}>
        <span className="mobile-nav-icon"><Icon className={active ? "text-blue-300 drop-shadow-[0_0_8px_rgba(96,165,250,.32)]" : "text-slate-400"} size={20} strokeWidth={active ? 2.35 : 1.85}/></span>
        <span className="mobile-nav-label">{t[messageKey]}</span>
      </Link>;
    })}
  </nav>;
}
