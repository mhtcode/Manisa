"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const colors = ["#60A5FA", "#34D399", "#A78BFA", "#22D3EE", "#F59E0B"];
export function FinancialCharts({ collections, methods, currency }: { collections: Array<{ name: string; amount: number }>; methods: Array<{ name: string; amount: number }>; currency: string }) {
  const money = (value: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  const style = { background: "#0b1320", border: "1px solid rgba(96,165,250,.28)", borderRadius: 12 };
  return <div className="grid gap-5 xl:grid-cols-2"><section className="panel overflow-hidden" data-swipe-lock><div className="panel-header"><h2 className="font-semibold">Collections over time</h2></div><div className="h-64 p-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={collections}><CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false}/><XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }}/><YAxis tick={{ fontSize: 10, fill: "#64748b" }}/><Tooltip formatter={(value) => money(Number(value))} contentStyle={style}/><Bar dataKey="amount" fill="#60A5FA" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></section><section className="panel overflow-hidden" data-swipe-lock><div className="panel-header"><h2 className="font-semibold">Payment distribution</h2></div><div className="h-64 p-3"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={methods} dataKey="amount" nameKey="name" innerRadius="42%" outerRadius="72%">{methods.map((item, index) => <Cell fill={colors[index % colors.length]} key={item.name}/>)}</Pie><Tooltip formatter={(value) => money(Number(value))} contentStyle={style}/></PieChart></ResponsiveContainer></div></section></div>;
}
