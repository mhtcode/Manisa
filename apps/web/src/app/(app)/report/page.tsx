import type { AppointmentStatus, PaymentStatus } from "@prisma/client";
import Link from "next/link";
import { Banknote, CalendarCheck2, CalendarClock, Clock3, CreditCard, Receipt, RotateCcw, TrendingUp, UserPlus, UsersRound } from "lucide-react";
import { addDays, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { PageHeading } from "@/components/page-heading";
import { ReportCharts } from "@/components/report-charts";
import { StatusBadge } from "@/components/status-badge";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { requireBusinessPermission } from "@/lib/auth";
import { customerName, formatMoney } from "@/lib/format";
import { collectionView } from "@/lib/preferences";
import { reportPercentChange } from "@/lib/report-metrics";
import { formatBusinessDate } from "@/lib/time";
import { intlLocale } from "@/lib/i18n";
import { getReportData, type ReportQuery } from "@/server/reporting";

const presets = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["ytd", "YTD"], ["all", "All time"]] as const;
const statuses: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED", "COMPLETED", "HISTORICAL", "CANCELLED", "NO_SHOW"];
const payments: PaymentStatus[] = ["UNPAID", "PAID", "PARTIALLY_PAID"];

function comparison(current: number, previous: number) {
  const percent = reportPercentChange(current, previous);
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(0)}%`;
}

function paramsFor(query: ReportQuery, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries({ ...query, ...patch }).forEach(([key, value]) => { if (value) params.set(key, value); });
  return `/report?${params}`;
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<ReportQuery> }) {
  const [query, user] = await Promise.all([searchParams, requireBusinessPermission("reports.view")]);
  const timezone = user.settings?.timezone || "America/Toronto";
  const locale = user.settings?.locale || "en";
  const currency = user.settings?.currency || "CAD";
  const data = await getReportData(user.businessId, query, timezone, locale);
  const view = collectionView(user.settings?.collectionViews, "reportRecords", "list");
  const metricCards = [
    ["Revenue", formatMoney(data.current.metrics.revenue, currency, locale), data.current.metrics.revenue, data.previous.metrics.revenue, Banknote],
    ["Finalized visits", String(data.current.metrics.visits), data.current.metrics.visits, data.previous.metrics.visits, CalendarCheck2],
    ["Actual hours", `${data.current.metrics.hours.toFixed(1)}h`, data.current.metrics.hours, data.previous.metrics.hours, Clock3],
    ["Hourly income", formatMoney(data.current.metrics.hourlyIncome, currency, locale), data.current.metrics.hourlyIncome, data.previous.metrics.hourlyIncome, TrendingUp],
    ["Average ticket", formatMoney(data.current.metrics.averageTicket, currency, locale), data.current.metrics.averageTicket, data.previous.metrics.averageTicket, Receipt],
    ["Outstanding", formatMoney(data.current.metrics.outstanding, currency, locale), data.current.metrics.outstanding, data.previous.metrics.outstanding, CreditCard],
    ["New customers", String(data.current.metrics.newCustomers), data.current.metrics.newCustomers, data.previous.metrics.newCustomers, UserPlus],
    ["Returning", String(data.current.metrics.returningCustomers), data.current.metrics.returningCustomers, data.previous.metrics.returningCustomers, UsersRound],
    ["Cancellations", String(data.current.metrics.cancellations), data.current.metrics.cancellations, data.previous.metrics.cancellations, RotateCcw],
    ["No-shows", String(data.current.metrics.noShows), data.current.metrics.noShows, data.previous.metrics.noShows, CalendarClock],
  ] as const;
  const chartParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value && key !== "serviceId") chartParams.set(key, value); });
  const dateLabel = `${formatBusinessDate(data.range.start, locale, timezone)} – ${formatBusinessDate(data.range.end, locale, timezone)}`;
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const previewDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const timeFormatter = new Intl.DateTimeFormat(intlLocale(locale), { hour: "numeric", minute: "2-digit", timeZone: timezone });

  return <>
    <PageHeading title="Report" description="Today’s studio pulse and a complete view of finalized income, work, customers, and appointment outcomes."/>
    <section className="mb-4 grid gap-3 sm:grid-cols-[.7fr_1.3fr]">
      <article className="group relative min-h-40 overflow-hidden rounded-2xl border border-blue-300/20 bg-gradient-to-br from-[#142541] to-[#0a1322] p-4 sm:p-5"><div aria-hidden="true" className="absolute inset-y-0 end-0 w-[64%] opacity-35 [mask-image:linear-gradient(to_left,black,transparent)]"><div className="grid h-10 grid-cols-7 border-b border-blue-200/15">{previewDays.map((day) => <span className={`flex items-center justify-center border-s border-blue-200/10 text-[9px] ${formatInTimeZone(day, timezone, "yyyy-MM-dd") === formatInTimeZone(now, timezone, "yyyy-MM-dd") ? "bg-blue-300/25 text-blue-100" : "text-blue-200/55"}`} key={day.toISOString()}>{formatInTimeZone(day, timezone, "d")}</span>)}</div><div className="relative h-full bg-[linear-gradient(rgba(147,197,253,.12)_1px,transparent_1px)] bg-[length:100%_1.55rem]">{data.overview.todayAppointments.slice(0,4).map((appointment,index) => <span className="absolute end-2 h-4 rounded border border-blue-200/25 bg-blue-300/25" key={appointment.id} style={{ insetInlineStart: `${24 + (index % 2) * 21}%`, top: `${12 + index * 22}%`, width: `${38 - (index % 2) * 7}%` }}/>)}</div></div><div className="relative z-10 flex h-full flex-col items-start"><p className="text-xs text-blue-200/75">Today’s appointments</p><p className="mt-2 text-3xl font-semibold text-white">{data.overview.todayCount}</p>{data.overview.todayAppointments[0] && <p className="mt-2 max-w-[55%] truncate text-[11px] text-blue-100/60">{timeFormatter.format(data.overview.todayAppointments[0].startAt)} · {customerName(data.overview.todayAppointments[0].customer)}</p>}<Link className="mt-auto inline-flex pt-4 text-xs font-semibold text-blue-300" href="/calendar">Open calendar →</Link></div></article>
      <article className="panel overflow-hidden"><div className="panel-header py-3"><h2 className="text-sm font-semibold text-white">Next visits</h2><Link className="text-xs font-semibold text-blue-300" href="/appointments">View all</Link></div><div className="grid gap-px bg-white/8 sm:grid-cols-2">{data.overview.upcoming.slice(0,4).map((appointment) => <Link className="min-w-0 bg-[#0e131b] px-4 py-3 hover:bg-blue-500/[0.06]" href={`/appointments/${appointment.id}`} key={appointment.id}><p className="truncate text-sm font-medium text-slate-100" dir="auto">{customerName(appointment.customer)}</p><p className="mt-1 truncate text-xs text-slate-500">{formatBusinessDate(appointment.startAt, locale, timezone)}</p></Link>)}{!data.overview.upcoming.length && <p className="bg-[#0e131b] px-4 py-6 text-center text-sm text-slate-500 sm:col-span-2">No upcoming appointments.</p>}</div></article>
    </section>

    <section className="panel mb-4 overflow-hidden"><div className="panel-header"><div><h2 className="font-semibold text-white">Analytics period</h2><p className="mt-1 text-xs text-slate-500">{dateLabel} · compared with the preceding {data.range.days} days</p></div></div><div className="p-4 sm:p-5"><div className="flex gap-2 overflow-x-auto pb-1" data-horizontal-scroll>{presets.map(([value,label]) => <Link aria-current={data.range.preset === value ? "page" : undefined} className={`filter-chip ${data.range.preset === value ? "active" : ""}`} href={paramsFor(query,{preset:value,from:undefined,to:undefined})} key={value}>{label}</Link>)}<Link aria-current={data.range.preset === "custom" ? "page" : undefined} className={`filter-chip ${data.range.preset === "custom" ? "active" : ""}`} href={paramsFor(query,{preset:"custom"})}>Custom</Link></div><details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-blue-300">Filters and custom dates</summary><form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><input name="preset" type="hidden" value={data.range.preset === "custom" ? "custom" : data.range.preset}/><div><label className="label" htmlFor="from">From</label><input className="field" id="from" name="from" type="date" defaultValue={query.from}/></div><div><label className="label" htmlFor="to">To</label><input className="field" id="to" name="to" type="date" defaultValue={query.to}/></div><div><label className="label" htmlFor="serviceId">Service</label><select className="field" id="serviceId" name="serviceId" defaultValue={query.serviceId || ""}><option value="">All services</option>{data.services.map((service) => <option key={service.id} value={service.id}>{service.category.name} · {service.name}</option>)}</select></div><div><label className="label" htmlFor="status">Status</label><select className="field" id="status" name="status" defaultValue={query.status || ""}><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div><div><label className="label" htmlFor="paymentStatus">Payment</label><select className="field" id="paymentStatus" name="paymentStatus" defaultValue={query.paymentStatus || ""}><option value="">All payments</option>{payments.map((payment) => <option key={payment}>{payment.replaceAll("_", " ")}</option>)}</select></div><div className="flex items-end"><button className="button w-full">Apply</button></div></form></details></div></section>

    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">{metricCards.map(([label,value,current,previous,Icon]) => { const change = comparison(current,previous); return <article className="stat report-stat" key={label}><div className="flex items-start justify-between gap-2"><p className="text-xs leading-5 text-slate-400">{label}</p><Icon className="shrink-0 text-blue-300" size={16}/></div><p className="mt-2.5 truncate text-lg font-semibold text-white sm:text-xl">{value}</p><p className={`mt-1 text-[10px] ${change.startsWith("-") ? "text-rose-300" : "text-emerald-300"}`}>{change} vs previous</p></article>; })}</div>
    <div className="mt-4"><ReportCharts busiestDays={data.current.busiestDays} busiestHours={data.current.busiestHours} currency={currency} locale={locale} monthlyHours={data.current.monthlyHours} outcomes={data.current.outcomes} payments={data.current.payments} previousTrend={data.previous.timeline} queryString={chartParams.toString()} services={data.current.services} trend={data.current.timeline}/></div>

    <section className="panel mt-4 max-w-full overflow-hidden" id="records"><div className="panel-header min-w-0"><div className="min-w-0"><h2 className="truncate font-semibold text-white">Filtered records</h2><p className="mt-1 truncate text-xs text-slate-500">{data.recordCount} results · showing up to 250 newest</p></div><ViewModeToggle initialMode={view} page="reportRecords"/></div>{data.records.length ? <div className={view === "grid" ? "grid min-w-0 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3" : "min-w-0 divide-y divide-white/8"}>{data.records.map((appointment) => <Link className={view === "grid" ? "min-w-0 max-w-full overflow-hidden rounded-xl border border-white/8 bg-white/[0.02] p-4 hover:border-blue-400/20" : "flex min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden px-4 py-3.5 hover:bg-blue-500/[0.04] sm:px-5"} href={`/appointments/${appointment.id}`} key={appointment.id}><div className="min-w-0 overflow-hidden"><p className="truncate text-sm font-semibold text-slate-100" dir="auto">{customerName(appointment.customer)}</p><p className="mt-1 max-w-full truncate text-xs text-slate-500" dir="auto">{appointment.serviceNameSnapshot} · {formatBusinessDate(appointment.startAt, locale, timezone)}</p>{view === "grid" && <p className="mt-3 truncate text-sm font-medium text-blue-200">{formatMoney(appointment.finalPrice || appointment.expectedPrice,appointment.currency,locale)}</p>}</div><div className={`${view === "grid" ? "mt-3" : ""} shrink-0 text-end`}><StatusBadge status={appointment.status}/>{view === "list" && <p className="mt-1.5 text-xs text-slate-400">{formatMoney(appointment.finalPrice || appointment.expectedPrice,appointment.currency,locale)}</p>}</div></Link>)}</div> : <div className="empty">No records match this report.</div>}</section>
  </>;
}
