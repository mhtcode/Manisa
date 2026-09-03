import Link from "next/link";
import { CalendarPlus, LogOut, Sparkles, UserRound } from "lucide-react";
import { DesktopNavigation, MobileNavigation } from "@/components/app-navigation";
import { PageSwipeNavigation } from "@/components/page-swipe-navigation";
import type { AppLocale } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n";
import { parseMobileNavigation } from "@/lib/mobile-navigation";
import { logout } from "@/server/actions/auth";
export function AppShell({ children, locale, userName, mobileNavOrder }: { children: React.ReactNode; locale: AppLocale; userName: string; mobileNavOrder?: string | null }) {
  const t = getMessages(locale);
  const mobileOrder = parseMobileNavigation(mobileNavOrder);
  return <div className="app-background min-h-screen md:grid md:grid-cols-[15.5rem_1fr]" dir={locale === "fa" ? "rtl" : "ltr"}>
    <aside className="sticky top-0 hidden h-screen border-e border-white/8 bg-[#090d13]/95 p-4 md:flex md:flex-col"><Link href="/report" prefetch={false} className="flex h-14 items-center gap-3 px-2"><span className="flex size-9 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/10 text-blue-300 shadow-[inset_0_1px_rgba(255,255,255,.12)]"><Sparkles size={18}/></span><span className="font-semibold">Manisa</span></Link><DesktopNavigation locale={locale}/><div className="mt-auto border-t border-white/8 pt-4"><p className="truncate px-3 text-sm font-medium text-slate-300">{userName}</p><form action={logout}><button className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-white/[0.05] hover:text-white"><LogOut size={17}/>{t.signOut}</button></form></div></aside>
    <div className="min-w-0"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-[#080b10]/88 px-4 backdrop-blur-xl md:px-8"><Link href="/report" prefetch={false} className="flex min-w-0 items-center gap-2 font-semibold md:hidden"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10 text-blue-300"><Sparkles size={16}/></span><span className="truncate">Manisa</span></Link><div className="hidden text-sm text-slate-500 md:block">{new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-CA", { dateStyle: "full" }).format(new Date())}</div><div className="flex items-center gap-2"><Link aria-label="Open Settings" className="header-profile" href="/settings" prefetch={false} title={userName}><UserRound size={17}/></Link><Link href="/appointments/new" prefetch={false} className="button appointment-cta h-10 min-h-10 px-3 sm:px-4"><CalendarPlus size={17}/><span className="hidden min-[390px]:inline">{t.newAppointment}</span></Link></div></header><PageSwipeNavigation order={mobileOrder} rtl={locale === "fa"}><main className="mx-auto max-w-[94rem] p-4 sm:p-5 md:p-8 lg:p-10">{children}</main></PageSwipeNavigation></div>
    <MobileNavigation locale={locale} order={mobileOrder}/>
  </div>;
}
