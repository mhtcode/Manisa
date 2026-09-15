"use client";

import Link from "next/link";
import { useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AppLocale } from "@/lib/i18n";

type Metric = "revenue" | "visits" | "hours";
type TrendPoint = { name: string; revenue: number; visits: number; hours: number };
type ServicePoint = { id: string; name: string; revenue: number; visits: number; hours: number };
type ValuePoint = { name: string; value: number };
type WorkPoint = { name: string; hours: number; revenue: number; visits: number };

const colors = ["#60A5FA", "#A78BFA", "#22D3EE", "#34D399", "#F59E0B", "#FB7185"];
const axis = { fontSize: 10, fill: "#94a3b8" };
const tooltip = { background: "#0b1320", border: "1px solid rgba(96,165,250,.28)", borderRadius: 12 };
const money = (value: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(value);
const metricValue = (metric: Metric, value: number) => metric === "revenue" ? money(value) : metric === "hours" ? `${value.toFixed(1)}h` : String(value);

function Switch({ value, onChange }: { value: Metric; onChange: (value: Metric) => void }) {
  return <div className="metric-switch" data-swipe-lock>{(["revenue", "visits", "hours"] as const).map((metric) => <button aria-pressed={value === metric} className={value === metric ? "active" : ""} key={metric} onClick={() => onChange(metric)} type="button">{metric}</button>)}</div>;
}

function ChartPanel({ id, title, expanded, setExpanded, action, children }: { id: string; title: string; expanded: string | null; setExpanded: (id: string | null) => void; action?: React.ReactNode; children: React.ReactNode }) {
  const open = expanded === id;
  return <section aria-label={title} className={`panel chart-panel min-w-0 overflow-hidden ${open ? "fixed inset-3 z-[70] flex flex-col shadow-2xl sm:inset-8" : ""}`} data-expanded={open || undefined} data-swipe-lock>
    <div className="panel-header"><h2 className="truncate text-base font-semibold">{title}</h2><div className="flex items-center gap-2">{action}<button aria-label={open ? `Close full-size ${title}` : `Open full-size ${title}`} className="icon-button" onClick={() => setExpanded(open ? null : id)} title={open ? "Close full size" : "Open full size"} type="button">{open ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</button></div></div>
    <div className={`p-3 sm:p-4 ${open ? "min-h-0 flex-1 overflow-auto" : ""}`}>{children}</div>
  </section>;
}

export function ReportCharts({ trend, previousTrend, services, outcomes, payments, busiestDays, busiestHours, monthlyHours, queryString }: { trend: TrendPoint[]; previousTrend: TrendPoint[]; services: ServicePoint[]; outcomes: ValuePoint[]; payments: ValuePoint[]; busiestDays: ValuePoint[]; busiestHours: ValuePoint[]; monthlyHours: WorkPoint[]; queryString: string; currency: string; locale: AppLocale }) {
  const [trendMetric, setTrendMetric] = useState<Metric>("revenue");
  const [serviceMetric, setServiceMetric] = useState<Metric>("revenue");
  const [expanded, setExpanded] = useState<string | null>(null);
  const trendData = trend.map((point, index) => ({ ...point, previous: previousTrend[index]?.[trendMetric] || 0 }));
  const empty = <div className="empty min-h-52">Finalize appointments to populate this chart.</div>;
  const panel = { expanded, setExpanded };

  return <div className="grid gap-4 lg:grid-cols-2">
    {expanded && <button aria-label="Close expanded chart" className="fixed inset-0 z-[60] cursor-default bg-black/70 backdrop-blur-md" onClick={() => setExpanded(null)} type="button"/>}
    <ChartPanel {...panel} id="trend" title="Performance over time" action={<Switch value={trendMetric} onChange={setTrendMetric}/>}>
      {trendData.length ? <div className="chart-canvas h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ left: -18, right: 8, top: 10 }}><defs><linearGradient id="report-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60A5FA" stopOpacity={0.32}/><stop offset="100%" stopColor="#60A5FA" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="rgba(148,163,184,.1)" vertical={false}/><XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} minTickGap={22}/><YAxis tick={axis} tickLine={false} axisLine={false}/><Tooltip contentStyle={tooltip} formatter={(value) => metricValue(trendMetric, Number(value))}/><Legend wrapperStyle={{ fontSize: 11 }}/><Area dataKey={trendMetric} name="Current" stroke="#60A5FA" strokeWidth={2.2} fill="url(#report-area)"/><Area dataKey="previous" name="Previous" stroke="#94A3B8" strokeDasharray="5 5" fill="transparent"/></AreaChart></ResponsiveContainer></div> : empty}
    </ChartPanel>
    <ChartPanel {...panel} id="services" title="Service performance" action={<Switch value={serviceMetric} onChange={setServiceMetric}/>}>
      {services.length ? <><div className="chart-canvas h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={services.slice(0, 8)} layout="vertical" margin={{ left: 4, right: 16 }}><CartesianGrid stroke="rgba(148,163,184,.1)" horizontal={false}/><XAxis type="number" tick={axis} tickLine={false} axisLine={false}/><YAxis dataKey="name" type="category" width={92} tick={axis} tickLine={false} axisLine={false}/><Tooltip cursor={{ fill: "rgba(96,165,250,.06)" }} contentStyle={tooltip} formatter={(value) => metricValue(serviceMetric, Number(value))}/><Bar dataKey={serviceMetric} fill="#60A5FA" radius={[0, 7, 7, 0]}/></BarChart></ResponsiveContainer></div><div className="mt-2 flex flex-wrap gap-2">{services.slice(0, 8).map((service) => <Link className="chart-filter-link" href={`/report?${queryString}${queryString ? "&" : ""}serviceId=${service.id}#records`} key={service.id}>{service.name}</Link>)}</div></> : empty}
    </ChartPanel>
    <ChartPanel {...panel} id="outcomes" title="Appointment outcomes">{outcomes.length ? <Donut data={outcomes}/> : empty}</ChartPanel>
    <ChartPanel {...panel} id="payments" title="Payment distribution">{payments.length ? <Donut data={payments} moneyValues offset={2}/> : empty}</ChartPanel>
    <ChartPanel {...panel} id="periods" title="Busiest periods">{busiestDays.length || busiestHours.length ? <div className="chart-canvas grid h-56 grid-cols-2 gap-2"><MiniBar data={busiestDays} color="#A78BFA"/><MiniBar data={busiestHours.slice(0, 8)} color="#22D3EE"/></div> : empty}</ChartPanel>
    <ChartPanel {...panel} id="hours" title="Monthly working hours">{monthlyHours.length ? <div className="chart-canvas h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyHours} margin={{ left: -18, right: 8 }}><CartesianGrid stroke="rgba(148,163,184,.1)" vertical={false}/><XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false}/><YAxis tick={axis} tickLine={false} axisLine={false}/><Tooltip contentStyle={tooltip}/><Legend wrapperStyle={{ fontSize: 10 }}/><Bar dataKey="hours" name="Hours" fill="#60A5FA" radius={[5,5,0,0]}/><Bar dataKey="visits" name="Visits" fill="#34D399" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div> : empty}</ChartPanel>
  </div>;
}

function Donut({ data, moneyValues = false, offset = 0 }: { data: ValuePoint[]; moneyValues?: boolean; offset?: number }) {
  return <div className="chart-canvas h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="72%" paddingAngle={3}>{data.map((point, index) => <Cell fill={colors[(index + offset) % colors.length]} key={point.name}/>)}</Pie><Tooltip contentStyle={tooltip} formatter={moneyValues ? (value) => money(Number(value)) : undefined}/><Legend wrapperStyle={{ fontSize: 10 }}/></PieChart></ResponsiveContainer></div>;
}

function MiniBar({ data, color }: { data: ValuePoint[]; color: string }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data}><XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false}/><YAxis tick={axis} tickLine={false} axisLine={false}/><Tooltip contentStyle={tooltip}/><Bar dataKey="value" fill={color} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>;
}
