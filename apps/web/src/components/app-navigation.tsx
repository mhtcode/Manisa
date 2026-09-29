"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, BookOpenCheck, CalendarCheck2, CalendarDays, ChartNoAxesCombined, CircleDollarSign, Images, Menu, MessageSquareQuote, Network, PlugZap, Settings, ShieldCheck, SwatchBook, Trash2, UserRoundCog, UsersRound, X } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n";
import { defaultMobileNavigation, mobileNavigationHrefs, type MobileNavigationKey } from "@/lib/mobile-navigation";
import type { BusinessPermission } from "@/lib/permissions";

const navigationItems = {
  report: ["/report", "report", ChartNoAxesCombined],
  calendar: ["/calendar", "calendar", CalendarDays],
  gallery: ["/gallery", "gallery", Images],
  settings: ["/settings", "settings", Settings],
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

export function DesktopNavigation({ locale, permissions, pendingReviewCount = 0 }: { locale: AppLocale; permissions: BusinessPermission[]; pendingReviewCount?: number }) {
  const pathname = usePathname();
  const t = getMessages(locale);
  const groups = [
    { label: locale === "fa" ? "فضای کاری" : "Workspace", items: [["/report", t.report, ChartNoAxesCombined], ["/calendar", t.calendar, CalendarDays], ["/gallery", t.gallery, Images]] as const },
    { label: locale === "fa" ? "مدیریت" : "Manage", items: [["/appointments", t.appointments, CalendarCheck2], ["/customers", t.customers, UsersRound], ["/services", locale === "fa" ? "خدمات و دسته‌بندی‌ها" : "Services & categories", SwatchBook]] as const },
    { label: locale === "fa" ? "مدیریت سیستم" : "Administration", items: [["/settings/financial", locale === "fa" ? "مالی" : "Financial", CircleDollarSign], ["/settings/referrals", locale === "fa" ? "معرفی مشتریان" : "Referrals", Network], ["/settings/reviews", locale === "fa" ? "نظرهای مشتریان" : "Customer reviews", MessageSquareQuote], ["/settings/members", locale === "fa" ? "اعضا و دسترسی" : "Members & access", UserRoundCog], ["/settings/business", locale === "fa" ? "کسب‌وکار و امنیت" : "Business & security", ShieldCheck], ["/settings/online-booking", locale === "fa" ? "رزرو آنلاین" : "Online booking", BookOpenCheck], ["/settings/integrations", locale === "fa" ? "اتصال‌ها" : "Connected services", PlugZap], ["/settings/data-transfer", locale === "fa" ? "انتقال داده" : "Data transfer", ArrowLeftRight], ["/settings/trash", locale === "fa" ? "زباله‌دان" : "Trash", Trash2], ["/settings", t.settings, Settings]] as const },
  ];
  const routePermission: Record<string, BusinessPermission> = { "/report": "reports.view", "/calendar": "appointments.view", "/gallery": "gallery.view", "/appointments": "appointments.view", "/customers": "customers.view", "/services": "services.view", "/settings/financial": "financial.view", "/settings/referrals": "customers.view", "/settings/reviews": "reviews.manage", "/settings/members": "members.manage", "/settings/online-booking": "business.manage", "/settings/integrations": "integrations.manage", "/settings/data-transfer": "data.import", "/settings/trash": "trash.manage" };
  return <nav aria-label="Full navigation" className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto pe-1">
    {groups.map((group) => { const visibleItems = group.items.filter(([href]) => !routePermission[href] || permissions.includes(routePermission[href])); return visibleItems.length ? <section key={group.label}><p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-700">{group.label}</p><div className="space-y-0.5">{visibleItems.map(([href, label, Icon]) => {
      const active = href === "/settings" ? pathname === href : isActive(pathname, href);
      return <Link aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${active ? "border-blue-400/25 bg-blue-500/10 font-medium text-blue-100" : "border-transparent text-slate-400 hover:bg-white/[0.05] hover:text-white"}`} href={href} key={href}><Icon className={active ? "text-blue-300" : "text-slate-500 group-hover:text-slate-300"} size={17}/><span className="truncate">{label}</span>{href === "/settings/reviews" && pendingReviewCount > 0 ? <span aria-label={`${pendingReviewCount} pending reviews`} className="ms-auto flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-[0_0_14px_rgba(244,63,94,.38)]">{pendingReviewCount > 99 ? "99+" : pendingReviewCount}</span> : active && <span className="ms-auto size-1.5 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,.75)]"/>}</Link>;
    })}</div></section> : null; })}
  </nav>;
}

export function DesktopTopNavigation({ locale, permissions }: { locale: AppLocale; permissions: BusinessPermission[] }) {
  const pathname = usePathname();
  const t = getMessages(locale);
  const items = [
    ["/report", t.report, ChartNoAxesCombined, "reports.view"],
    ["/calendar", t.calendar, CalendarDays, "appointments.view"],
    ["/gallery", t.gallery, Images, "gallery.view"],
    ["/appointments", t.appointments, CalendarCheck2, "appointments.view"],
    ["/customers", t.customers, UsersRound, "customers.view"],
    ["/services", locale === "fa" ? "خدمات" : "Services", SwatchBook, "services.view"],
    ["/settings", t.settings, Settings, null],
  ] as const;
  return <nav aria-label="Main navigation" className="desktop-top-navigation hidden overflow-x-auto border-t border-white/6 md:flex">
    {items.filter(([, , , permission]) => !permission || permissions.includes(permission)).map(([href, label, Icon]) => {
      const active = href === "/settings" ? isActive(pathname, href) : isActive(pathname, href);
      return <Link aria-current={active ? "page" : undefined} className={`desktop-top-navigation-item ${active ? "active" : ""}`} href={href} key={href}><Icon size={16}/><span>{label}</span></Link>;
    })}
  </nav>;
}

export function MobileNavigationDrawer({ locale, permissions, pendingReviewCount = 0 }: { locale: AppLocale; permissions: BusinessPermission[]; pendingReviewCount?: number }) {
  const [open, setOpen] = useState(false);
  return <>
    <button aria-expanded={open} aria-label={open ? "Close navigation" : "Open navigation"} className="header-profile size-10 rounded-full p-0 md:hidden" onClick={() => setOpen((value) => !value)} type="button">{open ? <X size={18}/> : <Menu size={18}/>}</button>
    {open && <div className="fixed inset-0 z-[70] md:hidden" data-swipe-lock>
      <button aria-label="Close navigation" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setOpen(false)} type="button"/>
      <aside className="absolute inset-y-0 start-0 flex w-[min(86vw,20rem)] flex-col border-e border-blue-300/15 bg-[#080d15]/96 p-4 shadow-[1.5rem_0_4rem_rgba(0,0,0,.45)] backdrop-blur-2xl">
        <div className="flex items-center justify-between"><p className="font-semibold text-white">{locale === "fa" ? "پیمایش" : "Navigation"}</p><button aria-label="Close navigation" className="icon-button" onClick={() => setOpen(false)} type="button"><X size={18}/></button></div>
        <div onClick={(event) => { if ((event.target as Element).closest("a[href]")) setOpen(false); }} className="min-h-0 flex-1 overflow-hidden"><DesktopNavigation locale={locale} pendingReviewCount={pendingReviewCount} permissions={permissions}/></div>
      </aside>
    </div>}
  </>;
}

export function MobileNavigation({ locale, order = defaultMobileNavigation }: { locale: AppLocale; order?: MobileNavigationKey[] }) {
  const pathname = usePathname();
  const t = getMessages(locale);
  const activeKey = activeMobileKey(pathname, order);
  return <nav aria-label="Mobile navigation" className="mobile-glass-nav fixed inset-x-3 z-50 grid grid-cols-4 p-1.5 md:hidden" data-swipe-lock>
    {order.map((key) => {
      const [href, messageKey, Icon] = navigationItems[key];
      const active = activeKey === key;
      return <Link aria-current={active ? "page" : undefined} aria-label={t[messageKey]} className={`mobile-nav-item relative flex min-h-[3.55rem] min-w-0 flex-col items-center justify-center gap-1 rounded-[1.15rem] px-1 py-1.5 transition ${active ? "mobile-nav-item-active text-blue-50" : "text-slate-400 active:bg-white/[0.065]"}`} href={href} key={key}>
        <span className="mobile-nav-icon"><Icon className={active ? "text-blue-300 drop-shadow-[0_0_8px_rgba(96,165,250,.32)]" : "text-slate-400"} size={20} strokeWidth={active ? 2.35 : 1.85}/></span>
        <span className="mobile-nav-label">{t[messageKey]}</span>
      </Link>;
    })}
  </nav>;
}
