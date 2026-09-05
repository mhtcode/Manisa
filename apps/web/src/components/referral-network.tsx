"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { GitFork, Search, UserRound, UsersRound, X } from "lucide-react";
import { filterReferralNodes, referralDepth, type ReferralFilter, type ReferralNode } from "@/lib/referrals";

type PositionedNode = ReferralNode & { x: number; y: number };
const filters: Array<[ReferralFilter, string]> = [["all", "All"], ["connected", "Connected"], ["referrers", "Referrers"], ["unreferred", "No source"], ["archived", "Archived"]];

function shortName(name: string) { return name.length > 22 ? `${name.slice(0, 20)}…` : name; }

export function ReferralNetwork({ customers }: { customers: ReferralNode[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReferralFilter>("all");
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(() => filterReferralNodes(customers, deferredQuery, filter), [customers, deferredQuery, filter]);
  const limited = useMemo(() => filtered.slice(0, 180), [filtered]);
  const layout = useMemo(() => {
    const byId = new Map(limited.map((node) => [node.id, node]));
    const groups = new Map<number, ReferralNode[]>();
    limited.forEach((node) => { const depth = referralDepth(node.id, byId); groups.set(depth, [...(groups.get(depth) || []), node]); });
    const positions: PositionedNode[] = [];
    groups.forEach((items, depth) => items.forEach((node, index) => positions.push({ ...node, x: 34 + depth * 230, y: 30 + index * 86 })));
    const maxDepth = positions.reduce((maximum, node) => Math.max(maximum, referralDepth(node.id, byId)), 0);
    return { maxDepth, positions };
  }, [limited]);
  const positioned = layout.positions;
  const byId = new Map(positioned.map((node) => [node.id, node]));
  const width = Math.max(680, 60 + (layout.maxDepth + 1) * 230);
  const height = Math.max(250, ...positioned.map((node) => node.y + 84));
  const relationCount = customers.filter((customer) => customer.referrerId).length;
  const referrerCount = new Set(customers.flatMap((customer) => customer.referrerId ? [customer.referrerId] : [])).size;

  return <div className="space-y-4">
    <section className="grid grid-cols-3 gap-2.5"><article className="stat p-3.5 sm:p-5"><UsersRound className="text-blue-300" size={17}/><p className="mt-3 text-[11px] text-slate-500">Customers</p><p className="mt-1 text-xl font-semibold text-white">{customers.length}</p></article><article className="stat p-3.5 sm:p-5"><GitFork className="text-violet-300" size={17}/><p className="mt-3 text-[11px] text-slate-500">Referral links</p><p className="mt-1 text-xl font-semibold text-white">{relationCount}</p></article><article className="stat p-3.5 sm:p-5"><UserRound className="text-emerald-300" size={17}/><p className="mt-3 text-[11px] text-slate-500">Referrers</p><p className="mt-1 text-xl font-semibold text-white">{referrerCount}</p></article></section>
    <section className="panel overflow-hidden"><div className="panel-header"><div><h2 className="font-semibold text-white">Customer referral graph</h2></div><span className="text-xs text-slate-500">{filtered.length} shown</span></div><div className="space-y-3 p-3 sm:p-5"><div className="field flex h-12 items-center gap-2 py-0"><Search className="shrink-0 text-slate-500" size={16}/><input aria-label="Filter referral customers" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600" onChange={(event) => setQuery(event.target.value)} placeholder="Filter by name, phone, or email…" value={query}/>{query && <button aria-label="Clear referral filter" className="text-slate-500 hover:text-white" onClick={() => setQuery("")} type="button"><X size={16}/></button>}</div><div className="flex gap-2 overflow-x-auto pb-1" data-horizontal-scroll>{filters.map(([value, label]) => <button aria-pressed={filter === value} className={`filter-chip ${filter === value ? "active" : ""}`} key={value} onClick={() => setFilter(value)} type="button">{label}</button>)}</div></div>
      {positioned.length ? <div className="max-h-[44rem] overflow-auto border-t border-white/8 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,.07),transparent_25rem)]" data-horizontal-scroll data-swipe-lock><svg aria-label={`Referral network showing ${positioned.length} customers`} height={height} role="img" width={width}><defs><marker id="referral-arrow" markerHeight="7" markerWidth="7" orient="auto" refX="7" refY="3.5"><path d="M0,0 L7,3.5 L0,7 Z" fill="#526581"/></marker></defs>{positioned.map((node) => { const parent = node.referrerId ? byId.get(node.referrerId) : null; return parent ? <path d={`M${parent.x + 188},${parent.y + 29} C${parent.x + 208},${parent.y + 29} ${node.x - 22},${node.y + 29} ${node.x - 5},${node.y + 29}`} fill="none" key={`edge-${node.id}`} markerEnd="url(#referral-arrow)" stroke="#526581" strokeOpacity=".72" strokeWidth="1.5"/> : null; })}{positioned.map((node) => <a href={`/customers/${node.id}`} key={node.id}><g className="cursor-pointer"><rect fill={node.referrerId ? "#111d31" : "#15284a"} height="58" rx="13" stroke={node.active ? "#36547c" : "#3f4652"} width="188" x={node.x} y={node.y}/><circle cx={node.x + 25} cy={node.y + 29} fill={node.active ? "#214b7b" : "#303744"} r="15"/><text fill="#bfdbfe" fontSize="11" fontWeight="700" textAnchor="middle" x={node.x + 25} y={node.y + 33}>{node.name.slice(0, 1).toLocaleUpperCase()}</text><text direction="auto" fill="#f1f5f9" fontSize="12" fontWeight="600" x={node.x + 49} y={node.y + 25}>{shortName(node.name)}</text><text fill={node.active ? "#71839d" : "#64748b"} fontSize="10" x={node.x + 49} y={node.y + 42}>{node.referrerId ? "Referred customer" : "Referral source"}{node.active ? "" : " · archived"}</text><title>{node.name}</title></g></a>)}</svg></div> : <div className="empty border-t border-white/8">No customers match this filter.</div>}
      {filtered.length > limited.length && <p className="border-t border-white/8 px-5 py-3 text-xs text-amber-200/70">Showing the first {limited.length} results. Narrow the filter to inspect the remaining customers.</p>}
    </section>
  </div>;
}
