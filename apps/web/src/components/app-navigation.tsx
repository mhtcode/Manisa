"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Ellipsis,
  LayoutDashboard,
  SwatchBook,
  Settings2,
  UsersRound,
  X,
} from "lucide-react";
import type { AppLocale } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n";

const primaryItems = [
  ["/dashboard", "dashboard", LayoutDashboard],
  ["/appointments", "appointments", CalendarCheck2],
  ["/calendar", "calendar", CalendarDays],
  ["/customers", "customers", UsersRound],
] as const;

const secondaryItems = [
  ["/services", "services", SwatchBook],
  ["/reports", "reports", ChartNoAxesCombined],
  ["/working-hours", "workingHours", Clock3],
  ["/settings", "settings", Settings2],
] as const;

const allItems = [
  primaryItems[0],
  primaryItems[1],
  primaryItems[3],
  secondaryItems[0],
  primaryItems[2],
  secondaryItems[1],
  secondaryItems[2],
  secondaryItems[3],
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNavigation({ locale }: { locale: AppLocale }) {
  const pathname = usePathname();
  const t = getMessages(locale);

  return (
    <nav aria-label="Main navigation" className="mt-6 space-y-1">
      {allItems.map(([href, key, Icon]) => {
        const active = isActive(pathname, href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
              active
                ? "border-teal-300/20 bg-teal-300/10 font-medium text-teal-200"
                : "border-transparent text-slate-400 hover:bg-white/[0.05] hover:text-white"
            }`}
            href={href}
            key={href}
            prefetch={false}
          >
            <Icon className={active ? "text-teal-300" : "text-slate-500 group-hover:text-slate-300"} size={18} />
            {t[key]}
            {active && <span className="ms-auto size-1.5 rounded-full bg-teal-300 shadow-[0_0_12px_rgba(94,234,212,.9)]" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavigation({ locale }: { locale: AppLocale }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const t = getMessages(locale);
  const moreActive = secondaryItems.some(([href]) => isActive(pathname, href));

  return (
    <>
      {moreOpen && (
        <button
          aria-label="Close more navigation"
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] md:hidden"
          onClick={() => setMoreOpen(false)}
          type="button"
        />
      )}

      {moreOpen && <div
        className="fixed inset-x-3 bottom-[6.75rem] z-50 rounded-[1.65rem] border border-white/12 bg-[#0a1119]/88 p-3 shadow-[0_24px_70px_rgba(0,0,0,.48)] backdrop-blur-2xl md:hidden"
        id="mobile-more-navigation"
      >
        <div className="flex items-center justify-between px-2 pb-3">
          <div>
            <p className="text-sm font-semibold text-white">More</p>
            <p className="mt-0.5 text-xs text-slate-500">Business tools and preferences</p>
          </div>
          <button
            aria-label="Close more navigation"
            className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300"
            onClick={() => setMoreOpen(false)}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {secondaryItems.map(([href, key, Icon]) => {
            const active = isActive(pathname, href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 text-sm transition ${
                  active
                    ? "border-teal-300/25 bg-teal-300/12 font-medium text-teal-200"
                    : "border-white/8 bg-white/[0.035] text-slate-300 active:bg-white/[0.08]"
                }`}
                href={href}
                key={href}
                onClick={() => setMoreOpen(false)}
                prefetch={false}
              >
                <span className={`flex size-9 items-center justify-center rounded-xl ${active ? "bg-teal-300/15 text-teal-300" : "bg-white/[0.05] text-slate-400"}`}>
                  <Icon size={18} />
                </span>
                {t[key]}
              </Link>
            );
          })}
        </div>
      </div>}

      <nav aria-label="Mobile navigation" className="mobile-glass-nav fixed inset-x-3 z-50 grid grid-cols-5 p-1.5 md:hidden">
        {primaryItems.map(([href, key, Icon]) => {
          const active = !moreOpen && isActive(pathname, href);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`mobile-nav-item relative flex min-h-[4.15rem] flex-col items-center justify-center gap-1 rounded-[1.45rem] px-1 text-[11px] transition ${
                active ? "mobile-nav-item-active font-semibold text-teal-100" : "text-slate-400 active:bg-white/[0.065]"
              }`}
              href={href}
              key={href}
              onClick={() => setMoreOpen(false)}
              prefetch={false}
            >
              <Icon className={active ? "text-teal-300 drop-shadow-[0_0_8px_rgba(94,234,212,.34)]" : "text-slate-400"} size={22} strokeWidth={active ? 2.35 : 1.85} />
              <span className="max-w-full truncate">{t[key]}</span>
            </Link>
          );
        })}
        <button
          aria-controls="mobile-more-navigation"
          aria-expanded={moreOpen}
          className={`mobile-nav-item relative flex min-h-[4.15rem] flex-col items-center justify-center gap-1 rounded-[1.45rem] px-1 text-[11px] transition ${
            moreOpen || moreActive ? "mobile-nav-item-active font-semibold text-teal-100" : "text-slate-400 active:bg-white/[0.065]"
          }`}
          onClick={() => setMoreOpen((open) => !open)}
          type="button"
        >
          <Ellipsis className={moreOpen || moreActive ? "text-teal-300 drop-shadow-[0_0_8px_rgba(94,234,212,.34)]" : "text-slate-400"} size={23} strokeWidth={moreOpen || moreActive ? 2.35 : 1.85} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
