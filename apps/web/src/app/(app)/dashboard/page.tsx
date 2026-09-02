import Link from "next/link";
import { CalendarCheck2, Clock3, Contact, DollarSign, TrendingUp, UsersRound, WalletCards } from "lucide-react";
import { AnalyticsCharts } from "@/components/analytics-charts";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { customerName, formatMoney } from "@/lib/format";
import { formatBusinessDate } from "@/lib/time";
import { getDashboardData } from "@/server/analytics";

export default async function DashboardPage() {
  const user = await requireUser(); const locale = user.settings?.locale || "en"; const currency = user.settings?.currency || "CAD"; const timezone = user.settings?.timezone || "America/Toronto";
  const data = await getDashboardData(timezone);
  const cards = [
    ["Today's appointments", data.kpis.todayCount, CalendarCheck2], ["This week", data.kpis.weekCount, TrendingUp], ["Customers", data.kpis.customerCount, Contact], ["Returning customers", data.kpis.returningCustomers, UsersRound],
    ["Finalized revenue · month", formatMoney(data.kpis.monthRevenue,currency,locale), DollarSign], ["Finalized revenue · year", formatMoney(data.kpis.yearRevenue,currency,locale), WalletCards], ["Finalized outstanding", formatMoney(data.kpis.outstanding,currency,locale), DollarSign], ["Finalized hours · month", `${data.kpis.hours.toFixed(1)}h`, Clock3], ["Actual hourly income", formatMoney(data.kpis.hourlyIncome,currency,locale), TrendingUp],
  ] as const;
  return <><PageHeading title={locale === "fa" ? "داشبورد" : "Dashboard"} description={locale === "fa" ? `خوش آمدید، ${user.name}` : `Welcome back, ${user.name}. Income and hours below use finalized appointments only.`} actions={<><Link className="button-secondary" href="/customers/new">+ Customer</Link><Link className="button-secondary" href="/services/new">+ Service</Link></>}/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">{cards.map(([label,value,Icon]) => <article className="stat" key={label}><div className="flex items-start justify-between"><p className="text-sm text-slate-500">{label}</p><Icon size={18} className="text-teal-300/70"/></div><p className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{value}</p></article>)}</div><div className="mt-5"><AnalyticsCharts revenue={data.revenueByMonth} services={data.serviceRevenue}/></div><section className="panel mt-5"><div className="panel-header"><div><h2 className="font-medium">Upcoming appointments</h2><p className="mt-1 text-xs text-slate-500">Stage 1 scheduled estimates</p></div><Link href="/appointments?stage=scheduled" className="text-sm text-teal-300">View all</Link></div>{data.upcoming.length ? <div className="divide-y divide-white/8">{data.upcoming.map((item) => <Link href={`/appointments/${item.id}`} key={item.id} className="flex flex-col gap-2 px-5 py-4 hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="font-medium">{customerName(item.customer)}</p><p className="mt-1 text-sm text-slate-500">{item.serviceNameSnapshot} · {formatBusinessDate(item.startAt,locale,timezone)}</p></div><StatusBadge status={item.status}/></Link>)}</div> : <div className="empty">No upcoming appointments.</div>}</section></>;
}
