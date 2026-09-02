"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, addWeeks, format, parseISO, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  Minus,
  Plus,
  Rows3,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

export type CalendarView = "day" | "week" | "month" | "agenda";

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
};

type CalendarBoardProps = {
  anchorKey: string;
  days: CalendarDay[];
  initialView: CalendarView;
  items: CalendarItem[];
  monthTitle: string;
  todayKey: string;
};

const views: { key: CalendarView; label: string; icon: typeof CalendarDays }[] = [
  { key: "day", label: "Day", icon: Rows3 },
  { key: "week", label: "Week", icon: CalendarDays },
  { key: "month", label: "Month", icon: CalendarDays },
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
const minimumSlotHeight = 44;
const maximumSlotHeight = 96;

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
  return format(direction === 1 ? addMonths(date, 1) : subMonths(date, 1), "yyyy-MM-dd");
}

function periodTitle(view: CalendarView, anchorKey: string, monthTitle: string, days: CalendarDay[], weekKeys: string[]) {
  if (view === "month" || view === "agenda") return monthTitle;
  if (view === "day") {
    return new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(parseISO(anchorKey));
  }
  const first = days.find((day) => day.key === weekKeys[0]);
  const last = days.find((day) => day.key === weekKeys.at(-1));
  return first && last ? `${first.monthLabel} ${first.dayNumber} – ${last.monthLabel} ${last.dayNumber}` : monthTitle;
}

export function CalendarBoard({ anchorKey, days, initialView, items, monthTitle, todayKey }: CalendarBoardProps) {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>(initialView);
  const [selectedKey, setSelectedKey] = useState(anchorKey);
  const [slotHeight, setSlotHeight] = useState(64);
  const [compactScreen, setCompactScreen] = useState(false);
  const gestureSurface = useRef<HTMLDivElement>(null);
  const slotHeightRef = useRef(slotHeight);
  const pinchStart = useRef<{ distance: number; height: number } | null>(null);
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
  const selectedWeekStart = startOfWeek(parseISO(selectedKey), { weekStartsOn: 1 });
  const selectedWeekKeys = Array.from({ length: 7 }, (_, index) => format(addDays(selectedWeekStart, index), "yyyy-MM-dd"));
  const selectedWeekIndex = Math.max(0, selectedWeekKeys.indexOf(selectedKey));
  const compactStart = Math.min(4, Math.max(0, selectedWeekIndex - 1));
  const visibleKeys = view === "day" ? [selectedKey] : compactScreen && view === "week" ? selectedWeekKeys.slice(compactStart, compactStart + 3) : selectedWeekKeys;
  const currentMonthKeys = new Set(days.filter((day) => day.isCurrentMonth).map((day) => day.key));
  const scopedItems = view === "day"
    ? items.filter((item) => item.dateKey === selectedKey)
    : view === "week"
      ? items.filter((item) => selectedWeekKeys.includes(item.dateKey))
      : items.filter((item) => currentMonthKeys.has(item.dateKey));
  const currentTitle = periodTitle(view, selectedKey, monthTitle, days, visibleKeys);

  function navigate(direction: -1 | 1) {
    const date = moveDate(selectedKey, view, direction);
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

  return (
    <section className="overflow-hidden rounded-[1.4rem] border border-white/9 bg-[#0c121a] shadow-[0_24px_70px_rgba(0,0,0,.22)]">
      <div className="border-b border-white/8 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex items-center rounded-xl border border-white/9 bg-white/[0.035] p-1">
              <button aria-label="Previous period" className="flex size-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/[0.07] hover:text-white" onClick={() => navigate(-1)} type="button"><ChevronLeft size={18} /></button>
              <button aria-label="Next period" className="flex size-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/[0.07] hover:text-white" onClick={() => navigate(1)} type="button"><ChevronRight size={18} /></button>
            </div>
            <button className="button-secondary h-11 min-h-11 px-4" onClick={goToday} type="button">Today</button>
            <h2 className="ms-1 truncate text-lg font-semibold tracking-tight text-white sm:text-xl">{currentTitle}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div aria-label="Calendar view" className="flex rounded-xl border border-white/9 bg-white/[0.035] p-1" role="group">
              {views.map(({ key, label, icon: Icon }) => (
                <button
                  aria-pressed={view === key}
                  className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition sm:px-3 ${view === key ? "bg-teal-300/14 text-teal-200 shadow-[inset_0_0_0_1px_rgba(94,234,212,.16)]" : "text-slate-500 hover:text-slate-200"}`}
                  key={key}
                  onClick={() => chooseView(key)}
                  type="button"
                >
                  <Icon className="hidden sm:block" size={14} />{label}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-xl border border-white/9 bg-white/[0.035] p-1" title="Calendar zoom">
              <button aria-label="Zoom out" className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-30" disabled={slotHeight <= minimumSlotHeight} onClick={() => setSlotHeight((height) => Math.max(minimumSlotHeight, height - 12))} type="button"><Minus size={15} /></button>
              <span className="min-w-14 text-center text-[10px] font-medium uppercase tracking-wide text-slate-500">{slotHeight <= 52 ? "Compact" : slotHeight >= 84 ? "Spacious" : "Comfort"}</span>
              <button aria-label="Zoom in" className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-30" disabled={slotHeight >= maximumSlotHeight} onClick={() => setSlotHeight((height) => Math.min(maximumSlotHeight, height + 12))} type="button"><Plus size={15} /></button>
            </div>
            <Link className="button h-11 min-h-11 px-3 sm:px-4" href={`/appointments/new?date=${selectedKey}`}><Plus size={16} /><span className="hidden sm:inline">Appointment</span></Link>
          </div>
        </div>
      </div>

      <div
        className="calendar-gesture-surface"
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }}
        ref={gestureSurface}
      >
        {(view === "day" || view === "week") && (
          <TimeGrid days={days} itemsByDay={itemsByDay} slotHeight={slotHeight} visibleKeys={visibleKeys} />
        )}
        {view === "month" && (
          <MonthGrid days={days} itemsByDay={itemsByDay} selectedKey={selectedKey} setSelectedKey={setSelectedKey} slotHeight={slotHeight} />
        )}
        {view === "agenda" && <Agenda days={days} items={scopedItems} />}
      </div>

      <div className="flex items-center justify-between border-t border-white/8 px-4 py-3 text-xs text-slate-600 sm:px-5">
        <span>{scopedItems.length} scheduled in this calendar period</span>
        <span className="flex items-center gap-1.5"><Clock3 size={13} /><span className="hidden sm:inline">Times shown in Toronto</span><span className="sm:hidden">Pinch calendar to zoom</span></span>
      </div>
    </section>
  );
}

function TimeGrid({ days, itemsByDay, slotHeight, visibleKeys }: { days: CalendarDay[]; itemsByDay: Map<string, CalendarItem[]>; slotHeight: number; visibleKeys: string[] }) {
  const visibleDays = visibleKeys.map((key) => days.find((day) => day.key === key)).filter((day): day is CalendarDay => Boolean(day));
  const minWidth = visibleDays.length === 1 ? 0 : visibleDays.length <= 3 ? 380 : 920;

  return (
    <div className="max-h-[68vh] overflow-auto">
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
              {hours.map((hour, index) => <Link aria-label={`Add appointment on ${day.weekday} at ${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`} className="absolute inset-x-0 z-0 border-t border-white/[0.055] transition hover:bg-teal-300/[0.035]" href={`/appointments/new?date=${day.key}&time=${String(hour).padStart(2,"0")}:00`} key={hour} style={{ top: index * slotHeight, height: slotHeight }} />)}
              {(itemsByDay.get(day.key) ?? []).map((item) => {
                const top = Math.max(0, ((item.startMinutes / 60) - startHour) * slotHeight);
                const height = Math.max(42, (item.durationMinutes / 60) * slotHeight - 3);
                return (
                  <Link className={`absolute inset-x-1.5 z-10 overflow-hidden rounded-lg border px-2.5 py-2 shadow-sm transition hover:brightness-110 ${eventColors[item.colorIndex % eventColors.length]}`} href={`/appointments/${item.id}`} key={item.id} style={{ top, height }}>
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
      <div className="md:hidden">
        <div className="grid grid-cols-7 border-b border-white/8 bg-white/[0.018] px-1">
          {days.slice(0, 7).map((day) => <div className="py-2.5 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-600" key={day.weekday}>{day.shortWeekday.slice(0, 1)}</div>)}
        </div>
        <div className="grid grid-cols-7 p-1.5">
          {days.map((day) => {
            const dayItems = itemsByDay.get(day.key) ?? [];
            const selected = day.key === selectedKey;
            return <button aria-label={`${day.weekday}, ${day.monthLabel} ${day.dayNumber}, ${dayItems.length} appointments`} className={`flex min-h-14 flex-col items-center rounded-xl py-1.5 transition active:scale-95 ${!day.isCurrentMonth ? "opacity-30" : ""} ${selected ? "bg-teal-300/12" : "active:bg-white/[0.06]"}`} key={day.key} onClick={() => setSelectedKey(day.key)} type="button">
              <span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${day.isToday ? "bg-teal-300 text-slate-950" : selected ? "bg-white/10 text-teal-200" : "text-slate-300"}`}>{day.dayNumber}</span>
              <span className="mt-1 flex h-1.5 items-center justify-center gap-0.5">{dayItems.slice(0, 3).map((item) => <span className={`size-1.5 rounded-full ${item.colorIndex % 4 === 0 ? "bg-teal-300" : item.colorIndex % 4 === 1 ? "bg-sky-300" : item.colorIndex % 4 === 2 ? "bg-violet-300" : "bg-rose-300"}`} key={item.id}/>)}</span>
            </button>;
          })}
        </div>
        <div className="border-t border-white/8 px-3 py-4">
          <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-white">{selectedDay ? `${selectedDay.weekday}, ${selectedDay.monthLabel} ${selectedDay.dayNumber}` : "Selected day"}</p><p className="mt-0.5 text-xs text-slate-600">{selectedItems.length} appointments</p></div><Link className="button-secondary h-9 min-h-9 px-3" href={`/appointments/new?date=${selectedKey}`}><Plus size={14}/>Add</Link></div>
          <div className="space-y-2">{selectedItems.map((item) => <Link className={`flex items-center gap-3 rounded-xl border p-3 ${eventColors[item.colorIndex % eventColors.length]}`} href={`/appointments/${item.id}`} key={item.id}><span className="text-xs font-semibold">{item.time}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.customer}</span><span className="block truncate text-[11px] opacity-65">{item.service} · {item.durationMinutes} min</span></span></Link>)}{!selectedItems.length && <Link className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-slate-500" href={`/appointments/new?date=${selectedKey}`}>No appointments · tap to add</Link>}</div>
        </div>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-b border-white/8 bg-white/[0.018]">
          {days.slice(0, 7).map((day) => <div className="border-e border-white/8 px-3 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.13em] text-slate-600 last:border-e-0" key={day.weekday}>{day.weekday}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayItems = itemsByDay.get(day.key) ?? [];
            const selected = day.key === selectedKey;
            return (
              <button className={`min-h-32 border-b border-e border-white/[0.065] p-2 text-start transition last:border-e-0 hover:bg-white/[0.025] ${!day.isCurrentMonth ? "bg-black/10 opacity-45" : ""} ${selected ? "bg-teal-300/[0.045] shadow-[inset_0_0_0_1px_rgba(94,234,212,.18)]" : ""}`} key={day.key} onClick={() => setSelectedKey(day.key)} type="button">
                <span className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${day.isToday ? "bg-teal-300 text-slate-950" : selected ? "bg-teal-300/15 text-teal-200" : "text-slate-400"}`}>{day.dayNumber}</span>
                <span className="mt-2 block space-y-1">
                  {dayItems.slice(0, maxItems).map((item) => <span className={`block truncate rounded-md border px-2 py-1 text-[10px] ${eventColors[item.colorIndex % eventColors.length]}`} key={item.id}><strong className="font-semibold">{item.time}</strong> {item.customer}</span>)}
                  {dayItems.length > maxItems && <span className="block px-1 text-[10px] font-medium text-slate-500">+{dayItems.length - maxItems} more</span>}
                </span>
              </button>
            );
          })}
        </div>
        </div>
      </div>
    </>
  );
}

function Agenda({ days, items }: { days: CalendarDay[]; items: CalendarItem[] }) {
  const dayMap = new Map(days.map((day) => [day.key, day]));
  if (!items.length) return <div className="empty"><CalendarDays className="mb-3 text-slate-700" size={28} /><p>No appointments in this period.</p><Link className="mt-4 text-sm font-medium text-teal-300" href="/appointments/new">Schedule an appointment</Link></div>;
  return (
    <div className="divide-y divide-white/8">
      {items.map((item, index) => {
        const day = dayMap.get(item.dateKey);
        const showDate = index === 0 || items[index - 1].dateKey !== item.dateKey;
        return (
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-[9rem_1fr] sm:px-6" key={item.id}>
            <div>{showDate && <><p className="text-sm font-semibold text-white">{day?.weekday}, {day?.monthLabel} {day?.dayNumber}</p>{day?.isToday && <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-teal-300">Today</span>}</>}</div>
            <Link className="group flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.025] p-3.5 transition hover:border-teal-300/25 hover:bg-white/[0.04]" href={`/appointments/${item.id}`}>
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
