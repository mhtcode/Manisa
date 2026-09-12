import Link from "next/link";
import { Bell, CalendarCheck2, Check, CheckCheck, ClockAlert, Inbox, MessageSquareMore, WalletCards } from "lucide-react";
import { DismissiblePopover } from "@/components/dismissible-popover";
import type { AppLocale } from "@/lib/i18n";
import { formatBusinessDate } from "@/lib/time";
import { markAllNotificationsRead, markNotificationRead } from "@/server/actions/notifications";
import type { ActionNotification } from "@/server/notifications";

const notificationIcons = { request: Inbox, review: MessageSquareMore, overdue: ClockAlert, payment: WalletCards, confirm: CalendarCheck2 } as const;
const copy = {
  en: { title: "Notifications", unread: "unread", actions: "updates", allRead: "Mark all read", markRead: "Mark read", empty: "You’re all caught up", open: "Open" },
  fa: { title: "اعلان‌ها", unread: "خوانده‌نشده", actions: "به‌روزرسانی", allRead: "خواندن همه", markRead: "خوانده شد", empty: "همه‌چیز بررسی شده", open: "باز کردن" },
} as const;

export function NotificationCenter({ items, locale, timezone }: { items: ActionNotification[]; locale: AppLocale; timezone: string }) {
  const unread = items.filter((item) => !item.read).length;
  const t = copy[locale];
  return <div data-swipe-lock><DismissiblePopover ariaLabel={`Notifications${unread ? `, ${unread} unread` : ""}`} panelClassName="fixed inset-x-3 top-[4.25rem] z-50 max-h-[min(32rem,calc(100dvh-6rem))] overflow-hidden rounded-2xl border border-blue-300/20 bg-[#0b121d]/98 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-xl sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:w-[23rem]" rootClassName="relative z-40" trigger={<><Bell size={17}/>{unread > 0 && <span className="absolute -end-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}</>} triggerClassName="relative flex size-10 items-center justify-center rounded-xl border border-blue-400/20 bg-gradient-to-b from-[#18335e] to-[#0c1b34] text-blue-200 shadow-[inset_0_1px_rgba(255,255,255,.12)] transition active:scale-[.97]">
    <div>
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3"><div><p className="text-sm font-semibold text-white">{t.title}</p><p className="text-[11px] text-slate-500">{unread} {t.unread} · {items.length} {t.actions}</p></div>{unread > 0 && <form action={markAllNotificationsRead}><button aria-label={t.allRead} className="icon-button" title={t.allRead}><CheckCheck size={16}/></button></form>}</div>
      <div className="max-h-[min(27rem,calc(100dvh-10rem))] overflow-y-auto overscroll-contain">
        {items.length ? items.map((item) => { const Icon = notificationIcons[item.kind]; return <article className={`border-b border-white/7 p-3 last:border-0 ${item.read ? "opacity-55" : "bg-blue-500/[0.035]"}`} key={item.key}><div className="flex min-w-0 gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Icon size={16}/></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-100">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-400" dir="auto">{item.body}</p><p className="mt-1 text-[10px] text-slate-600">{formatBusinessDate(item.createdAt, locale, timezone)}</p><div className="mt-2 flex items-center gap-2"><Link className="button-secondary min-h-8 px-3 py-1 text-xs" href={item.actionHref}>{t.open}</Link>{!item.read && <form action={markNotificationRead.bind(null, item.key)}><button aria-label={t.markRead} className="icon-button size-8" title={t.markRead}><Check size={15}/></button></form>}</div></div></div></article>; }) : <div className="px-5 py-10 text-center"><CheckCheck className="mx-auto text-emerald-300" size={24}/><p className="mt-3 text-sm font-medium text-slate-200">{t.empty}</p></div>}
      </div>
    </div>
  </DismissiblePopover></div>;
}
