"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, addWeeks, addYears, format, parseISO, startOfMonth, startOfWeek, subDays, subMonths, subWeeks, subYears } from "date-fns";
import {
  Calendar1,
  CalendarDays,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Columns3,
  Grid2X2,
  List,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { intlLocale, type AppLocale } from "@/lib/i18n";

export type CalendarView = "day" | "week" | "month" | "year" | "agenda";

export type CalendarDay = {
  key: string;
  weekday: string;
  shortWeekday: string;
  dayNumber: string;
  monthLabel: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type CalendarItem = {
  id: string;
  dateKey: string;
  time: string;
  startMinutes: number;
  durationMinutes: number;
  customer: string;
  service: string;
  status: string;
  colorIndex: number;
  href: string;
  kind: "appointment" | "request";
};

type CalendarBoardProps = {
  anchorKey: string;
  days: CalendarDay[];
  initialView: CalendarView;
  items: CalendarItem[];
  monthTitle: string;
  todayKey: string;
  locale: AppLocale;
};

const views: { key: CalendarView; label: string; icon: typeof CalendarDays }[] = [
  { key: "day", label: "Day", icon: Calendar1 },
  { key: "week", label: "Week", icon: Columns3 },
  { key: "month", label: "Month", icon: CalendarDays },
  { key: "year", label: "Year", icon: Grid2X2 },
  { key: "agenda", label: "Agenda", icon: List },
];

const eventColors = [
  "border-teal-300/30 bg-teal-300/14 text-teal-100",
  "border-sky-300/30 bg-sky-300/14 text-sky-100",
  "border-violet-300/30 bg-violet-300/14 text-violet-100",
  "border-rose-300/30 bg-rose-300/14 text-rose-100",
] as const;

const startHour = 7;
const endHour = 22;
const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
const minimumSlotHeight = 36;
const maximumSlotHeight = 80;

function touchDistance(touches: TouchList) {
  const first = touches.item(0);
  const second = touches.item(1);
  if (!first || !second) return 0;
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

function moveDate(dateKey: string, view: CalendarView, direction: -1 | 1) {
  const date = parseISO(dateKey);
  if (view === "day") return format(direction === 1 ? addDays(date, 1) : subDays(date, 1), "yyyy-MM-dd");
  if (view === "week") return format(direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1), "yyyy-MM-dd");
  if (view === "year") return format(direction === 1 ? addYears(date, 1) : subYears(date, 1), "yyyy-MM-dd");
  return format(direction === 1 ? addMonths(date, 1) : subMonths(date, 1), "yyyy-MM-dd");
}

function periodTitle(view: CalendarView, anchorKey: string, monthTitle: string, days: CalendarDay[], weekKeys: string[], locale: AppLocale) {
  if (view === "month" || view === "agenda") return monthTitle;
  if (view === "year") return format(parseISO(anchorKey), "yyyy");
  if (view === "day") {
    return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(parseISO(anchorKey));
  }
  const first = days.find((day) => day.key === weekKeys[0]);
  const last = days.find((day) => day.key === weekKeys.at(-1));
  return first && last ? `${first.monthLabel} ${first.dayNumber} – ${last.monthLabel} ${last.dayNumber}` : monthTitle;
}

export function CalendarBoard({ anchorKey, days, initialView, items, monthTitle, todayKey, locale }: CalendarBoardProps) {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>(initialView);
  const [selectedKey, setSelectedKey] = useState(anchorKey);
  const [slotHeight, setSlotHeight] = useState(52);
  const [compactScreen, setCompactScreen] = useState(false);
  const gestureSurface = useRef<HTMLDivElement>(null);
  const slotHeightRef = useRef(slotHeight);
  const pinchStart = useRef<{ distance: number; height: number } | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const suppressClickTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    slotHeightRef.current = slotHeight;
  }, [slotHeight]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setCompactScreen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const surface = gestureSurface.current;
    if (!surface) return;
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      pinchStart.current = { distance: touchDistance(event.touches), height: slotHeightRef.current };
      suppressClick.current = false;
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchStart.current) return;
      const distance = touchDistance(event.touches);
      if (!distance || !pinchStart.current.distance) return;
      event.preventDefault();
      const nextHeight = Math.round(pinchStart.current.height * (distance / pinchStart.current.distance));
      if (Math.abs(nextHeight - pinchStart.current.height) > 3) suppressClick.current = true;
      setSlotHeight(Math.min(maximumSlotHeight, Math.max(minimumSlotHeight, nextHeight)));
    };
    const end = () => {
      pinchStart.current = null;
      window.clearTimeout(suppressClickTimer.current);
      suppressClickTimer.current = window.setTimeout(() => { suppressClick.current = false; }, 450);
    };
    surface.addEventListener("touchstart", start, { passive: true });
    surface.addEventListener("touchmove", move, { passive: false });
    surface.addEventListener("touchend", end, { passive: true });
    surface.addEventListener("touchcancel", end, { passive: true });
    return () => {
      surface.removeEventListener("touchstart", start);
      surface.removeEventListener("touchmove", move);
      surface.removeEventListener("touchend", end);
      surface.removeEventListener("touchcancel", end);
      window.clearTimeout(suppressClickTimer.current);
    };
  }, []);
  const itemsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>();
    for (const item of items) grouped.set(item.dateKey, [...(grouped.get(item.dateKey) ?? []), item]);
    return grouped;
  }, [items]);
  const selectedWeekStart = startOfWeek(parseISO(selectedKey), { weekStartsOn: 0 });
  const selectedWeekKeys = Array.from({ length: 7 }, (_, index) => format(addDays(selectedWeekStart, index), "yyyy-MM-dd"));
  const selectedWeekIndex = Math.max(0, selectedWeekKeys.indexOf(selectedKey));
  const compactStart = Math.min(4, Math.max(0, selectedWeekIndex - 1));
  const visibleKeys = view === "day" ? [selectedKey] : compactScreen && view === "week" ? selectedWeekKeys.slice(compactStart, compactStart + 3) : selectedWeekKeys;
  const currentMonthKeys = new Set(days.filter((day) => day.isCurrentMonth).map((day) => day.key));
  const scopedItems = view === "day"
    ? items.filter((item) => item.dateKey === selectedKey)
    : view === "week"
      ? items.filter((item) => selectedWeekKeys.includes(item.dateKey))
      : view === "year"
        ? items.filter((item) => item.dateKey.startsWith(selectedKey.slice(0, 4)))
        : items.filter((item) => currentMonthKeys.has(item.dateKey));
  const currentTitle = periodTitle(view, selectedKey, monthTitle, days, visibleKeys, locale);

  function navigate(direction: -1 | 1) {
    const date = moveDate(selectedKey, view, direction);
    setSelectedKey(date);
    router.push(`/calendar?date=${date}&view=${view}`);
  }

  function chooseView(nextView: CalendarView) {
    setView(nextView);
    router.replace(`/calendar?date=${selectedKey}&view=${nextView}`, { scroll: false });
  }

  function goToday() {
    setSelectedKey(todayKey);
    router.push(`/calendar?date=${todayKey}&view=${view}`);
  }

  function openMonth(dateKey: string) {
    setSelectedKey(dateKey);
    setView("month");
    router.replace(`/calendar?date=${dateKey}&view=month`, { scroll: false });
  }

  return (
    <section className="studio-calendar-board -mx-4 -mt-2 flex h-[calc(100svh-10.25rem)] min-w-0 flex-col overflow-hidden border-y border-white/9 bg-[#0b1017] shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:-mx-5 md:mx-0 md:mt-0 md:h-[calc(100svh-8rem)] md:rounded-[1.2rem] md:border-x">
      <div className="shrink-0 border-b border-white/9 bg-[#080b10] px-2.5 py-2 sm:px-4 sm:py-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
          <button aria-label="Previous period" className="flex size-9 items-center justify-center rounded-full bg-white/[0.035] text-slate-300 transition active:scale-95 active:bg-white/[0.08]" onClick={() => navigate(-1)} title="Previous" type="button"><ChevronLeft size={18} /></button>
          <div className="min-w-0 text-center sm:text-start">
            <p className="hidden text-[10px] font-semibold uppercase tracking-[.16em] text-teal-300/65 sm:block">Studio calendar</p>
            <h1 className="truncate text-base font-bold tracking-[-.025em] text-white sm:mt-0.5 sm:text-lg">{currentTitle}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button aria-label="Today" className="flex size-9 items-center justify-center rounded-full bg-white/[0.035] text-teal-300 transition active:scale-95 active:bg-white/[0.08]" onClick={goToday} title="Today" type="button"><CircleDot size={17}/></button>
            <button aria-label="Next period" className="flex size-9 items-center justify-center rounded-full bg-white/[0.035] text-slate-300 transition active:scale-95 active:bg-white/[0.08]" onClick={() => navigate(1)} title="Next" type="button"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div aria-label="Calendar view" className="mt-2 grid grid-cols-5 rounded-full bg-[#0d131b] p-1" role="group">
          {views.map(({ key, label, icon: Icon }) => (
            <button aria-label={label} aria-pressed={view === key} className={`flex min-w-0 items-center justify-center rounded-full py-2 transition ${view === key ? "bg-teal-300/14 text-teal-200 shadow-[inset_0_0_0_1px_rgba(94,234,212,.18)]" : "text-slate-600 active:bg-white/[0.05]"}`} key={key} onClick={() => chooseView(key)} title={label} type="button">
              <Icon size={15}/><span className="sr-only">{label}</span>
            </button>
          ))}
        </div>

        {(view === "day" || view === "week" || view === "month") && <div className="mt-1 flex justify-end gap-1">
          <button aria-label="Make calendar more compact" className="flex size-7 items-center justify-center rounded-full text-slate-600 active:bg-white/[0.08] disabled:opacity-20" disabled={slotHeight <= minimumSlotHeight} onClick={() => setSlotHeight((height) => Math.max(minimumSlotHeight, height - 8))} title="Compact" type="button"><Minus size={13}/></button>
          <button aria-label="Make calendar larger" className="flex size-7 items-center justify-center rounded-full text-slate-600 active:bg-white/[0.08] disabled:opacity-20" disabled={slotHeight >= maximumSlotHeight} onClick={() => setSlotHeight((height) => Math.min(maximumSlotHeight, height + 8))} title="Larger" type="button"><Plus size={13}/></button>
        </div>}
      </div>

      <div
        className="calendar-gesture-surface min-h-0 flex-1 overflow-hidden"
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }}
        onTouchEnd={(event) => {
          const start = swipeStart.current;
          const end = event.changedTouches.item(0);
          swipeStart.current = null;
          if (!start || !end) return;
          const horizontal = end.clientX - start.x;
          const vertical = end.clientY - start.y;
          if (Math.abs(horizontal) < 56 || Math.abs(horizontal) < Math.abs(vertical) * 1.35) return;
          suppressClick.current = true;
          navigate(horizontal < 0 ? 1 : -1);
        }}
        onTouchStart={(event) => {
          const touch = event.touches.item(0);
          swipeStart.current = event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        ref={gestureSurface}
      >
        {(view === "day" || view === "week") && (
          <TimeGrid days={days} itemsByDay={itemsByDay} slotHeight={slotHeight} visibleKeys={visibleKeys} />
        )}
        {view === "month" && (
          <MonthGrid days={days} itemsByDay={itemsByDay} selectedKey={selectedKey} setSelectedKey={setSelectedKey} slotHeight={slotHeight} />
        )}
        {view === "year" && <YearGrid anchorKey={selectedKey} itemsByDay={itemsByDay} locale={locale} onSelectMonth={openMonth} todayKey={todayKey} />}
        {view === "agenda" && <Agenda days={days} items={scopedItems} />}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-white/8 px-3 py-2 text-[10px] text-slate-600 sm:px-4">
        <span>{scopedItems.length} scheduled</span>
        <span className="flex items-center gap-1.5"><Clock3 size={13} /><span className="hidden sm:inline">Times shown in Toronto</span><span className="sm:hidden">Toronto time</span></span>
      </div>
    </section>
  );
}

function TimeGrid({ days, itemsByDay, slotHeight, visibleKeys }: { days: CalendarDay[]; itemsByDay: Map<string, CalendarItem[]>; slotHeight: number; visibleKeys: string[] }) {
  const visibleDays = visibleKeys.map((key) => days.find((day) => day.key === key)).filter((day): day is CalendarDay => Boolean(day));
  const minWidth = visibleDays.length === 1 ? 0 : visibleDays.length <= 3 ? 380 : 920;

  return (
    <div className="h-full overflow-auto">
      <div style={{ minWidth }}>
        <div className="sticky top-0 z-20 grid border-b border-white/8 bg-[#0c121a]/95 backdrop-blur-xl" style={{ gridTemplateColumns: `4.5rem repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
          <div className="border-e border-white/8" />
          {visibleDays.map((day) => (
            <div className={`border-e border-white/8 px-3 py-3 text-center last:border-e-0 ${day.isToday ? "bg-teal-300/[0.045]" : ""}`} key={day.key}>
              <p className={`text-[10px] font-medium uppercase tracking-[0.13em] ${day.isToday ? "text-teal-300" : "text-slate-600"}`}>{day.shortWeekday}</p>
              <p className={`mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-sm font-semibold ${day.isToday ? "bg-teal-300 text-slate-950" : "text-slate-200"}`}>{day.dayNumber}</p>
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `4.5rem repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
          <div className="relative border-e border-white/8" style={{ height: hours.length * slotHeight }}>
            {hours.map((hour, index) => <span className="absolute end-3 -translate-y-1/2 text-[10px] text-slate-600" key={hour} style={{ top: index * slotHeight }}>{hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</span>)}
          </div>
          {visibleDays.map((day) => (
            <div className={`relative border-e border-white/8 last:border-e-0 ${day.isToday ? "bg-teal-300/[0.025]" : ""}`} key={day.key} style={{ height: hours.length * slotHeight }}>
              {hours.map((hour, index) => <Link aria-label={`Add appointment on ${day.weekday} at ${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`} className="group absolute inset-x-0 z-0 flex items-center justify-center border-t border-white/[0.055] transition hover:bg-teal-300/[0.035]" href={`/appointments/new?date=${day.key}&time=${String(hour).padStart(2,"0")}:00`} key={hour} style={{ top: index * slotHeight, height: slotHeight }}><Plus className="text-teal-200 opacity-0 transition group-hover:opacity-80" size={17}/></Link>)}
              {(itemsByDay.get(day.key) ?? []).map((item) => {
                const top = Math.max(0, ((item.startMinutes / 60) - startHour) * slotHeight);
                const height = Math.max(42, (item.durationMinutes / 60) * slotHeight - 3);
                return (
                  <Link className={`absolute inset-x-1.5 z-10 overflow-hidden rounded-lg border px-2.5 py-2 shadow-sm transition hover:brightness-110 ${eventColors[item.colorIndex % eventColors.length]} ${item.kind === "request" ? "border-dashed" : ""}`} href={item.href} key={item.id} style={{ top, height }}>
                    <p className="truncate text-[11px] font-semibold">{item.time} · {item.customer}</p>
                    {height > 48 && <p className="mt-1 truncate text-[10px] opacity-65">{item.service}</p>}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({ days, itemsByDay, selectedKey, setSelectedKey, slotHeight }: { days: CalendarDay[]; itemsByDay: Map<string, CalendarItem[]>; selectedKey: string; setSelectedKey: (key: string) => void; slotHeight: number }) {
  const maxItems = slotHeight <= 52 ? 2 : slotHeight < 84 ? 3 : 4;
  const selectedDay = days.find((day) => day.key === selectedKey);
  const selectedItems = itemsByDay.get(selectedKey) ?? [];
  return (
    <>
      <div className="flex h-full min-h-0 flex-col md:hidden">
        <div className="grid grid-cols-7 border-b border-white/8 bg-[#080b10] px-1">
          {days.slice(0, 7).map((day, index) => <div className={`py-2.5 text-center text-[9px] font-bold uppercase tracking-wide ${index === 0 ? "text-rose-400/70" : "text-slate-500"}`} key={day.weekday}>{day.shortWeekday.slice(0, 1)}</div>)}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-[2px] bg-[#070a0e] p-1">
          {days.map((day) => {
            const dayItems = itemsByDay.get(day.key) ?? [];
            const selected = day.key === selectedKey;
            const visibleItems = slotHeight <= 52 ? 1 : 2;
            return <button aria-label={`${day.weekday}, ${day.monthLabel} ${day.dayNumber}, ${dayItems.length} appointments`} className={`min-h-0 min-w-0 overflow-hidden rounded-md border p-1 text-start transition active:scale-[.98] ${!day.isCurrentMonth ? "border-transparent bg-[#0c1015] opacity-35" : "border-white/[0.035] bg-[#12171d]"} ${selected ? "border-teal-300/45 bg-teal-300/[0.075] shadow-[inset_0_0_0_1px_rgba(94,234,212,.12)]" : ""}`} key={day.key} onClick={() => setSelectedKey(day.key)} type="button">
              <span className="flex items-center justify-center">
                <span className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${day.isToday ? "bg-teal-300 text-slate-950" : selected ? "bg-white/10 text-teal-200" : "text-slate-200"}`}>{day.dayNumber}</span>
              </span>
              <span className="mt-1 block space-y-0.5">
                {dayItems.slice(0, visibleItems).map((item) => <span className={`block truncate rounded-[4px] border px-1 py-0.5 text-[8px] font-medium leading-[11px] ${eventColors[item.colorIndex % eventColors.length]}`} key={item.id}>{item.customer}</span>)}
                {dayItems.length > visibleItems && <span className="block truncate px-0.5 text-[8px] font-semibold text-slate-500">+{dayItems.length - visibleItems}</span>}
              </span>
            </button>;
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-white/8 bg-[#0b1017] px-3 py-2"><p className="min-w-0 flex-1 truncate text-xs text-slate-400">{selectedDay ? `${selectedDay.shortWeekday} ${selectedDay.dayNumber}` : "Day"} · {selectedItems.length} scheduled</p><Link aria-label="Add appointment on selected day" className="flex size-8 items-center justify-center rounded-full bg-blue-500 text-white" href={`/appointments/new?date=${selectedKey}`} title="Add appointment"><Plus size={15}/></Link></div>
      </div>
      <div className="hidden h-full overflow-auto md:block">
        <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-b border-white/8 bg-white/[0.018]">
          {days.slice(0, 7).map((day) => <div className="border-e border-white/8 px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.13em] text-slate-600 last:border-e-0" key={day.weekday}>{day.weekday}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayItems = itemsByDay.get(day.key) ?? [];
            const selected = day.key === selectedKey;
            return (
              <div className={`relative min-h-24 border-b border-e border-white/[0.065] p-2 text-start transition last:border-e-0 hover:bg-white/[0.025] ${!day.isCurrentMonth ? "bg-black/10 opacity-45" : ""} ${selected ? "bg-teal-300/[0.045] shadow-[inset_0_0_0_1px_rgba(94,234,212,.18)]" : ""}`} key={day.key}>
                <button aria-label={`Select ${day.weekday}, ${day.monthLabel} ${day.dayNumber}`} className="absolute inset-0 z-0" onClick={() => setSelectedKey(day.key)} type="button"/>
                <span className={`pointer-events-none relative z-[1] flex size-7 items-center justify-center rounded-full text-xs font-semibold ${day.isToday ? "bg-teal-300 text-slate-950" : selected ? "bg-teal-300/15 text-teal-200" : "text-slate-400"}`}>{day.dayNumber}</span>
                {selected && <Link aria-label={`Add appointment on ${day.weekday}, ${day.monthLabel} ${day.dayNumber}`} className="absolute end-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition hover:bg-blue-400" href={`/appointments/new?date=${day.key}`}><Plus size={15}/></Link>}
                <span className="pointer-events-none relative z-[1] mt-2 block space-y-1">
                  {dayItems.slice(0, maxItems).map((item) => <span className={`block truncate rounded-md border px-2 py-1 text-[10px] ${eventColors[item.colorIndex % eventColors.length]}`} key={item.id}><strong className="font-semibold">{item.time}</strong> {item.customer}</span>)}
                  {dayItems.length > maxItems && <span className="block px-1 text-[10px] font-medium text-slate-500">+{dayItems.length - maxItems} more</span>}
                </span>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </>
  );
}

function YearGrid({ anchorKey, itemsByDay, onSelectMonth, todayKey, locale }: { anchorKey: string; itemsByDay: Map<string, CalendarItem[]>; onSelectMonth: (key: string) => void; todayKey: string; locale: AppLocale }) {
  const year = Number(anchorKey.slice(0, 4));
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthDate = parseISO(`${year}-${String(monthIndex + 1).padStart(2, "0")}-01`);
    const monthStart = startOfMonth(monthDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const monthDays = Array.from({ length: 42 }, (_, dayIndex) => addDays(calendarStart, dayIndex));
    const appointmentCount = monthDays.reduce((count, day) => day.getMonth() === monthIndex ? count + (itemsByDay.get(format(day, "yyyy-MM-dd"))?.length ?? 0) : count, 0);
    return { appointmentCount, monthDate, monthDays, monthIndex };
  });

  return <div className="grid h-full grid-cols-2 gap-2 overflow-auto bg-[#080b10] p-2 sm:gap-3 sm:p-4 lg:grid-cols-3 2xl:grid-cols-4">
    {months.map(({ appointmentCount, monthDate, monthDays, monthIndex }) => <button aria-label={`Open ${new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(monthDate)}, ${appointmentCount} appointments`} className="min-w-0 rounded-xl border border-white/8 bg-[#10151c] p-2.5 text-start transition hover:border-teal-300/25 hover:bg-[#121a22] active:scale-[.99] sm:p-3" key={monthIndex} onClick={() => onSelectMonth(format(monthDate, "yyyy-MM-dd"))} type="button">
      <span className="mb-2 flex items-center justify-between gap-2"><strong className="text-xs font-semibold text-slate-100 sm:text-sm">{new Intl.DateTimeFormat(intlLocale(locale), { month: "long" }).format(monthDate)}</strong><span className="text-[9px] font-medium text-slate-600">{appointmentCount || "—"}</span></span>
      <span aria-hidden="true" className="grid grid-cols-7 text-center">{weekdays.map((weekday, index) => <span className={`pb-1 text-[7px] font-semibold ${index === 0 ? "text-rose-400/55" : "text-slate-700"}`} key={`${weekday}-${index}`}>{weekday}</span>)}</span>
      <span aria-hidden="true" className="grid grid-cols-7 gap-y-0.5 text-center">{monthDays.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const inMonth = day.getMonth() === monthIndex;
        const hasItems = inMonth && (itemsByDay.get(key)?.length ?? 0) > 0;
        return <span className={`relative mx-auto flex size-4 items-center justify-center rounded-full text-[8px] sm:size-5 sm:text-[9px] ${!inMonth ? "text-transparent" : key === todayKey ? "bg-teal-300 font-bold text-slate-950" : "text-slate-400"}`} key={key}>{format(day, "d")}{hasItems && key !== todayKey && <span className="absolute bottom-0 size-0.5 rounded-full bg-teal-300"/>}</span>;
      })}</span>
    </button>)}
  </div>;
}

function Agenda({ days, items }: { days: CalendarDay[]; items: CalendarItem[] }) {
  const dayMap = new Map(days.map((day) => [day.key, day]));
  if (!items.length) return <div className="empty"><CalendarDays className="mb-3 text-slate-700" size={28} /><p>No appointments in this period.</p><Link className="mt-4 text-sm font-medium text-teal-300" href="/appointments/new">Schedule an appointment</Link></div>;
  return (
    <div className="h-full divide-y divide-white/8 overflow-auto">
      {items.map((item, index) => {
        const day = dayMap.get(item.dateKey);
        const showDate = index === 0 || items[index - 1].dateKey !== item.dateKey;
        return (
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-[9rem_1fr] sm:px-6" key={item.id}>
            <div>{showDate && <><p className="text-sm font-semibold text-white">{day?.weekday}, {day?.monthLabel} {day?.dayNumber}</p>{day?.isToday && <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-teal-300">Today</span>}</>}</div>
            <Link className={`group flex items-center gap-4 rounded-xl border bg-white/[0.025] p-3.5 transition hover:border-teal-300/25 hover:bg-white/[0.04] ${item.kind === "request" ? "border-dashed border-fuchsia-300/25" : "border-white/8"}`} href={item.href}>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${eventColors[item.colorIndex % eventColors.length]}`}><Sparkles size={17} /></span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-teal-300">{item.time} · {item.durationMinutes} min</span><span className="mt-1 block truncate text-sm font-semibold text-white">{item.customer}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{item.service}</span></span>
              <StatusBadge status={item.status} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
