import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { subMonths } from "date-fns";
import { Banknote, CalendarCheck2, Clock3, TrendingUp, UserPlus } from "lucide-react";
import { AnalyticsCharts } from "@/components/analytics-charts";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { parseBusinessDateTime } from "@/lib/time";

const statuses = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
const payments = ["UNPAID", "PAID", "PARTIALLY_PAID"] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; serviceId?: string; status?: string; paymentStatus?: string }> }) {
  const filters = await searchParams;
  const from = filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? parseBusinessDateTime(`${filters.from}T00:00`) : subMonths(new Date(), 6);
  const to = filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? parseBusinessDateTime(`${filters.to}T23:59`) : new Date();
  const status = statuses.find((value) => value === filters.status);
  const paymentStatus = payments.find((value) => value === filters.paymentStatus);
  const where: Prisma.AppointmentWhereInput = {
    startAt: { gte: from, lte: to },
    ...(filters.serviceId ? { OR: [{ serviceId: filters.serviceId }, { serviceLines: { some: { serviceId: filters.serviceId } } }] } : {}),
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
  };
  const [appointments, services, newCustomers] = await Promise.all([
    prisma.appointment.findMany({ where, include: { serviceLines: { orderBy: { position: "asc" } } }, orderBy: { startAt: "desc" } }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.customer.count({ where: { createdAt: { gte: from, lte: to } } }),
  ]);
  const completed = appointments.filter((appointment) => appointment.status === "COMPLETED");
  const revenue = completed.reduce((sum, appointment) => sum + Number(appointment.finalPrice || 0), 0);
  const minutes = completed.reduce((sum, appointment) => sum + (appointment.actualDurationMinutes || 0), 0);
  const serviceMap = new Map<string, number>();
  completed.forEach((appointment) => {
    const lines = appointment.serviceLines.length ? appointment.serviceLines : [{ serviceNameSnapshot: appointment.serviceNameSnapshot, price: appointment.finalPrice || appointment.expectedPrice }];
    lines.forEach((line) => serviceMap.set(line.serviceNameSnapshot, (serviceMap.get(line.serviceNameSnapshot) || 0) + Number(line.price)));
  });
  const serviceData = [...serviceMap].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const monthData = new Map<string, number>();
  completed.forEach((appointment) => { const name = new Intl.DateTimeFormat("en", { month: "short", year: "2-digit" }).format(appointment.completedAt || appointment.startAt); monthData.set(name, (monthData.get(name) || 0) + Number(appointment.finalPrice || 0)); });
  const stats = [
    { label: "Finalized revenue", value: formatMoney(revenue), icon: Banknote, tone: "text-teal-300 bg-teal-300/10" },
    { label: "Finalized visits", value: String(completed.length), icon: CalendarCheck2, tone: "text-sky-300 bg-sky-300/10" },
    { label: "New customers", value: String(newCustomers), icon: UserPlus, tone: "text-violet-300 bg-violet-300/10" },
    { label: "Finalized hours", value: `${(minutes / 60).toFixed(1)}h`, icon: Clock3, tone: "text-amber-300 bg-amber-300/10" },
    { label: "Actual hourly income", value: formatMoney(minutes ? revenue / (minutes / 60) : 0), icon: TrendingUp, tone: "text-rose-300 bg-rose-300/10" },
  ];

  return <>
    <PageHeading title="Reports" description="Financial and time totals use finalized appointment actuals only."/>
    <details className="panel group mb-4 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-medium text-slate-200 sm:px-5"><span>Report filters</span><span className="text-xs font-normal text-slate-500 group-open:hidden">Tap to refine results</span><span className="hidden text-xs font-normal text-slate-500 group-open:inline">Hide filters</span></summary>
      <form className="grid gap-3 border-t border-white/8 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <div><label className="label" htmlFor="from">From</label><input className="field" id="from" name="from" type="date" defaultValue={filters.from}/></div>
        <div><label className="label" htmlFor="to">To</label><input className="field" id="to" name="to" type="date" defaultValue={filters.to}/></div>
        <div><label className="label" htmlFor="serviceId">Service</label><select className="field" id="serviceId" name="serviceId" defaultValue={filters.serviceId}><option value="">All services</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></div>
        <div><label className="label" htmlFor="status">Status</label><select className="field" id="status" name="status" defaultValue={filters.status}><option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></div>
        <div><label className="label" htmlFor="paymentStatus">Payment</label><select className="field" id="paymentStatus" name="paymentStatus" defaultValue={filters.paymentStatus}><option value="">All payments</option>{payments.map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></div>
        <div className="flex items-end"><button className="button w-full">Apply</button></div>
      </form>
    </details>

    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map(({ label, value, icon: Icon, tone }, index) => <article className={`rounded-2xl border border-white/8 bg-[#0e131b] p-3.5 sm:p-5 ${index === stats.length - 1 ? "col-span-2 sm:col-span-1" : ""}`} key={label}><div className={`flex size-8 items-center justify-center rounded-lg ${tone}`}><Icon size={16}/></div><p className="mt-3 text-[11px] text-slate-500 sm:text-xs">{label}</p><p className="mt-1.5 truncate text-lg font-semibold tracking-tight text-white sm:text-2xl">{value}</p></article>)}
    </div>
    <div className="mt-4"><AnalyticsCharts revenue={[...monthData].map(([name, value]) => ({ name, value }))} services={serviceData}/></div>
    <section className="panel mt-4 overflow-hidden"><div className="panel-header"><h2 className="font-medium">Report records</h2><span className="text-xs text-slate-500">{appointments.length} results</span></div><div className="divide-y divide-white/8">{appointments.slice(0, 50).map((appointment) => <Link href={`/appointments/${appointment.id}`} key={appointment.id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.025] sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-medium" dir="auto">{appointment.serviceNameSnapshot}</p><p className="mt-1 text-xs text-slate-600">{new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(appointment.startAt)}</p></div><div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3"><StatusBadge status={appointment.status}/><span className="text-sm text-slate-300">{formatMoney(appointment.finalPrice || appointment.expectedPrice, appointment.currency)}</span></div></Link>)}</div></section>
  </>;
}
