import { addDays, addYears, format, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { CalendarBoard, type CalendarView } from "@/components/calendar-board";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const timeZone = "America/Toronto";
const allowedViews = new Set<CalendarView>(["day", "week", "month", "year", "agenda"]);

function validDateKey(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00Z`).valueOf());
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string; view?: string }> }) {
  const { date, view } = await searchParams;
  const todayKey = formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
  const anchorKey = validDateKey(date) ? date! : todayKey;
  const anchor = new Date(`${anchorKey}T12:00:00Z`);
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const yearStart = startOfYear(anchor);
  const rangeGridStart = startOfWeek(yearStart, { weekStartsOn: 0 });
  const rangeGridEnd = addDays(startOfWeek(addYears(yearStart, 1), { weekStartsOn: 0 }), 7);
  const rangeStart = fromZonedTime(`${format(rangeGridStart, "yyyy-MM-dd")}T00:00:00`, timeZone);
  const rangeEnd = fromZonedTime(`${format(rangeGridEnd, "yyyy-MM-dd")}T00:00:00`, timeZone);
  const initialView: CalendarView = allowedViews.has(view as CalendarView) ? view as CalendarView : "month";

  const appointments = await prisma.appointment.findMany({
    where: { deletedAt: null, startAt: { gte: rangeStart, lt: rangeEnd }, status: { not: "CANCELLED" } },
    include: { customer: true },
    orderBy: { startAt: "asc" },
  });

  const days = Array.from({ length: 42 }, (_, index) => {
    const day = addDays(gridStart, index);
    const key = format(day, "yyyy-MM-dd");
    return {
      key,
      weekday: new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(day),
      shortWeekday: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(day),
      dayNumber: format(day, "d"),
      monthLabel: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(day),
      isCurrentMonth: day.getUTCMonth() === anchor.getUTCMonth(),
      isToday: key === todayKey,
    };
  });
  const serviceColors = new Map<string, number>();
  const items = appointments.map((item) => {
    if (!serviceColors.has(item.serviceNameSnapshot)) serviceColors.set(item.serviceNameSnapshot, serviceColors.size);
    const hour = Number(formatInTimeZone(item.startAt, timeZone, "H"));
    const minute = Number(formatInTimeZone(item.startAt, timeZone, "m"));
    return {
      id: item.id,
      dateKey: formatInTimeZone(item.startAt, timeZone, "yyyy-MM-dd"),
      time: formatInTimeZone(item.startAt, timeZone, "h:mm a"),
      startMinutes: hour * 60 + minute,
      durationMinutes: item.expectedDurationMinutes,
      customer: customerName(item.customer),
      service: item.serviceNameSnapshot,
      status: item.status,
      colorIndex: serviceColors.get(item.serviceNameSnapshot) ?? 0,
    };
  });

  return <CalendarBoard anchorKey={anchorKey} days={days} initialView={initialView} items={items} key={`${anchorKey}:${initialView}`} monthTitle={new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(anchor)} todayKey={todayKey}/>;
}
