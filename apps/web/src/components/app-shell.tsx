import Link from "next/link";
import { CalendarPlus, LogOut, Settings } from "lucide-react";
import { DesktopNavigation, MobileNavigation } from "@/components/app-navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleRuntime } from "@/components/locale-runtime";
import { NotificationCenter } from "@/components/notification-center";
import { PageSwipeNavigation } from "@/components/page-swipe-navigation";
import type { AppLocale } from "@/lib/i18n";
import { getMessages, intlLocale } from "@/lib/i18n";
import { parseMobileNavigation } from "@/lib/mobile-navigation";
import { logout } from "@/server/actions/auth";
import type { ActionNotification } from "@/server/notifications";
import type { BusinessPermission } from "@/lib/permissions";
import { GlobalSearch } from "@/components/global-search";

export function AppShell({ children, locale, userName, businessName, mobileNavOrder, notifications, timezone, permissions }: { children: React.ReactNode; locale: AppLocale; userName: string; businessName: string; mobileNavOrder?: string | null; notifications: ActionNotification[]; timezone: string; permissions: BusinessPermission[] }) {
  const t = getMessages(locale);
  const mobileOrder = parseMobileNavigation(mobileNavOrder);
  return <div className="app-background min-h-screen md:grid md:grid-cols-[17rem_1fr]" dir={locale === "fa" ? "rtl" : "ltr"} lang={locale}>
    <aside className="sticky top-0 hidden h-screen border-e border-white/8 bg-[#090d13]/95 p-4 md:flex md:flex-col">
      <Link href="/report" prefetch={false} className="flex h-14 items-center gap-3 px-2"><BrandLogo size={40}/><span className="truncate font-semibold">{businessName}</span></Link>
      <DesktopNavigation locale={locale} permissions={permissions}/>
      <div className="mt-auto border-t border-white/8 pt-4"><p className="truncate px-3 text-sm font-medium text-slate-300">{userName}</p><form action={logout}><button className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-white/[0.05] hover:text-white"><LogOut size={17}/>{t.signOut}</button></form></div>
    </aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-[#080b10]/88 px-4 backdrop-blur-xl md:px-8">
        <Link href="/report" prefetch={false} className="flex min-w-0 items-center gap-2 font-semibold md:hidden"><BrandLogo size={36}/><span className="truncate">{businessName}</span></Link>
        <div className="hidden text-sm text-slate-500 md:block">{new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "full" }).format(new Date())}</div>
        <div className="flex items-center gap-2"><GlobalSearch permissions={permissions}/><NotificationCenter items={notifications} locale={locale} timezone={timezone}/><Link aria-label={t.settings} className="header-profile size-10 p-0" href="/settings" prefetch={false} title={`${t.settings} · ${userName}`}><Settings size={18}/></Link><Link href="/appointments/new" prefetch={false} className="button appointment-cta h-10 min-h-10 px-3 sm:px-4"><CalendarPlus size={17}/><span className="hidden min-[520px]:inline">{t.newAppointment}</span></Link></div>
      </header>
      <LocaleRuntime locale={locale}><PageSwipeNavigation order={mobileOrder} rtl={locale === "fa"}><main className="mx-auto max-w-[94rem] p-4 sm:p-5 md:p-8 lg:p-10">{children}</main></PageSwipeNavigation></LocaleRuntime>
    </div>
    <MobileNavigation locale={locale} order={mobileOrder}/>
  </div>;
}
