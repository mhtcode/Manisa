import Link from "next/link";
import { CalendarPlus, Settings } from "lucide-react";
import { MobileNavigation, MobileNavigationDrawer } from "@/components/app-navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleRuntime } from "@/components/locale-runtime";
import { NotificationCenter } from "@/components/notification-center";
import { PageSwipeNavigation } from "@/components/page-swipe-navigation";
import type { AppLocale } from "@/lib/i18n";
import { getMessages, intlLocale } from "@/lib/i18n";
import { parseMobileNavigation } from "@/lib/mobile-navigation";
import type { ActionNotification } from "@/server/notifications";
import type { BusinessPermission } from "@/lib/permissions";
import { GlobalSearch } from "@/components/global-search";

export function AppShell({ children, locale, userName, businessName, mobileNavOrder, notifications, timezone, permissions, pendingReviewCount = 0 }: { children: React.ReactNode; locale: AppLocale; userName: string; businessName: string; mobileNavOrder?: string | null; notifications: ActionNotification[]; timezone: string; permissions: BusinessPermission[]; pendingReviewCount?: number }) {
  const t = getMessages(locale);
  const mobileOrder = parseMobileNavigation(mobileNavOrder);
  return <div className="app-background min-h-screen" dir={locale === "fa" ? "rtl" : "ltr"} lang={locale}>
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#080b10]/88 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-2"><MobileNavigationDrawer locale={locale} pendingReviewCount={pendingReviewCount} permissions={permissions}/><Link href="/report" className="flex min-w-0 items-center gap-2 font-semibold"><BrandLogo size={36}/><span className="truncate">{businessName}</span></Link><span className="ms-4 hidden text-sm text-slate-500 xl:block">{new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "full" }).format(new Date())}</span></div>
        <div className="app-header-actions flex items-center gap-2"><GlobalSearch permissions={permissions}/><NotificationCenter items={notifications} locale={locale} timezone={timezone}/><Link aria-label={t.settings} className="header-profile size-10 rounded-full p-0" href="/settings" title={`${t.settings} · ${userName}`}><Settings size={18}/></Link><Link aria-label={t.newAppointment} className="header-profile size-10 rounded-full p-0" href="/appointments/new" title={t.newAppointment}><CalendarPlus size={17}/></Link></div>
      </div>
    </header>
    <LocaleRuntime locale={locale}><PageSwipeNavigation order={mobileOrder} rtl={locale === "fa"}><main className="mx-auto max-w-[94rem] p-4 sm:p-5 md:p-8 lg:p-10">{children}</main></PageSwipeNavigation></LocaleRuntime>
    <MobileNavigation locale={locale} order={mobileOrder}/>
  </div>;
}
