import Link from "next/link";
import { addDays, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
  const requested = Number((await searchParams).offset || 0);
  const offset = Number.isFinite(requested) ? Math.max(-52, Math.min(52, requested)) : 0;
  const start = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), offset * 7);
  const end = addDays(start, 7);
  const appointments = await prisma.appointment.findMany({ where: { startAt: { gte: start, lt: end }, status: { not: "CANCELLED" } }, include: { customer: true }, orderBy: { startAt: "asc" } });
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  return <><PageHeading title="Calendar" description="A database-backed weekly view of scheduled work." actions={<><Link className="button-secondary" href={`/calendar?offset=${offset - 1}`}>Previous</Link><Link className="button-secondary" href="/calendar">Today</Link><Link className="button-secondary" href={`/calendar?offset=${offset + 1}`}>Next</Link></>}/><div className="grid gap-3 lg:grid-cols-7">{days.map((day) => {
    const dateKey = formatInTimeZone(day, "America/Toronto", "yyyy-MM-dd");
    const items = appointments.filter((item) => formatInTimeZone(item.startAt, "America/Toronto", "yyyy-MM-dd") === dateKey);
    return <section className="panel min-h-40 p-3" key={day.toISOString()}><div className="border-b border-white/8 pb-3"><p className="text-xs uppercase tracking-wider text-slate-600">{new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "America/Toronto" }).format(day)}</p><p className="mt-1 text-lg font-semibold">{formatInTimeZone(day, "America/Toronto", "d")}</p></div><div className="mt-3 space-y-2">{items.map((item) => <Link href={`/appointments/${item.id}`} key={item.id} className="block rounded-xl border border-white/8 bg-white/[0.03] p-3 hover:border-teal-300/30"><p className="text-xs text-teal-300">{formatInTimeZone(item.startAt, "America/Toronto", "h:mm a")}</p><p className="mt-1 truncate text-sm font-medium">{customerName(item.customer)}</p><p className="mt-1 truncate text-xs text-slate-600">{item.serviceNameSnapshot}</p><div className="mt-2"><StatusBadge status={item.status}/></div></Link>)}</div></section>;
  })}</div></>;
}
