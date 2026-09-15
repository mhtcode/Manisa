"use client";
/* eslint-disable @next/next/no-img-element -- protected customer avatars */

import { useDeferredValue, useMemo, useState } from "react";
import { GitFork, Search, UserRound, UsersRound, X } from "lucide-react";
import { filterReferralNodes, referralDepth, type ReferralFilter, type ReferralNode } from "@/lib/referrals";

type PositionedNode = ReferralNode & { x: number; y: number };
const filters: Array<[ReferralFilter, string]> = [["all", "All"], ["connected", "Connected"], ["referrers", "Referrers"], ["unreferred", "No source"], ["archived", "Archived"]];
const shortName = (name: string) => name.length > 22 ? `${name.slice(0, 20)}…` : name;

export function ReferralNetwork({ customers }: { customers: ReferralNode[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReferralFilter>("all");
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(() => filterReferralNodes(customers, deferredQuery, filter), [customers, deferredQuery, filter]);
  const limited = useMemo(() => filtered.slice(0, 180), [filtered]);
  const layout = useMemo(() => {
    const nodeMap = new Map(limited.map((node) => [node.id, node]));
    const groups = new Map<number, ReferralNode[]>();
    limited.forEach((node) => { const depth = referralDepth(node.id, nodeMap); groups.set(depth, [...(groups.get(depth) || []), node]); });
    const positions: PositionedNode[] = [];
    groups.forEach((items, depth) => items.forEach((node, index) => positions.push({ ...node, x: 34 + depth * 230, y: 30 + index * 86 })));
    return { positions, maxDepth: positions.reduce((maximum, node) => Math.max(maximum, referralDepth(node.id, nodeMap)), 0) };
  }, [limited]);
  const positioned = layout.positions;
  const byId = new Map(positioned.map((node) => [node.id, node]));
  const width = Math.max(680, 60 + (layout.maxDepth + 1) * 230);
  const height = Math.max(250, ...positioned.map((node) => node.y + 84));
  const relationCount = customers.filter((customer) => customer.referrerId).length;
  const referrerCount = new Set(customers.flatMap((customer) => customer.referrerId ? [customer.referrerId] : [])).size;

  return <div className="space-y-4">
    <section className="grid grid-cols-3 gap-2">
      <Metric icon={UsersRound} label="Customers" value={customers.length} tone="text-blue-300"/>
      <Metric icon={GitFork} label="Referral links" value={relationCount} tone="text-violet-300"/>
      <Metric icon={UserRound} label="Referrers" value={referrerCount} tone="text-emerald-300"/>
    </section>
    <section className="panel overflow-hidden">
      <div className="panel-header"><h2 className="font-semibold">Customer referral graph</h2><span className="text-xs text-slate-400">{filtered.length} shown</span></div>
      <div className="space-y-3 p-3 sm:p-5"><div className="field flex h-12 items-center gap-2 py-0"><Search className="shrink-0 text-slate-400" size={16}/><input aria-label="Filter referral customers" className="min-w-0 flex-1 bg-transparent text-sm outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Filter by name, phone, or email…" value={query}/>{query && <button aria-label="Clear referral filter" className="icon-button size-8" onClick={() => setQuery("")} type="button"><X size={14}/></button>}</div><div className="flex gap-2 overflow-x-auto" data-horizontal-scroll>{filters.map(([value, label]) => <button aria-pressed={filter === value} className={`filter-chip ${filter === value ? "active" : ""}`} key={value} onClick={() => setFilter(value)} type="button">{label}</button>)}</div></div>
      {positioned.length ? <>
        <div className="divide-y divide-white/10 border-t border-white/10 md:hidden">{limited.map((node) => { const source = node.referrerId ? customers.find((customer) => customer.id === node.referrerId) : null; return <a className="flex min-w-0 items-center gap-3 p-4" href={`/customers/${node.id}`} key={node.id}><Avatar node={node}/><span className="min-w-0 flex-1"><span className="block truncate font-semibold" dir="auto">{node.name}</span><span className="mt-1 block truncate text-xs text-slate-400">{source ? `Introduced by ${source.name}` : "No referral source"}</span></span><GitFork className={source ? "text-violet-300" : "text-slate-500"} size={16}/></a>; })}</div>
        <div className="hidden max-h-[44rem] overflow-auto border-t border-white/10 md:block" data-horizontal-scroll data-swipe-lock><svg aria-label={`Referral network showing ${positioned.length} customers`} height={height} role="img" width={width}>
          <defs><marker id="referral-arrow" markerHeight="7" markerWidth="7" orient="auto" refX="7" refY="3.5"><path d="M0,0 L7,3.5 L0,7 Z" fill="#71839d"/></marker>{positioned.filter((node) => node.avatarId).map((node) => <clipPath id={`avatar-${node.id}`} key={node.id}><circle cx={node.x + 25} cy={node.y + 29} r="15"/></clipPath>)}</defs>
          {positioned.map((node) => { const parent = node.referrerId ? byId.get(node.referrerId) : null; return parent ? <path d={`M${parent.x + 188},${parent.y + 29} C${parent.x + 208},${parent.y + 29} ${node.x - 22},${node.y + 29} ${node.x - 5},${node.y + 29}`} fill="none" key={`edge-${node.id}`} markerEnd="url(#referral-arrow)" stroke="#71839d" strokeOpacity=".72" strokeWidth="1.5"/> : null; })}
          {positioned.map((node) => <a href={`/customers/${node.id}`} key={node.id}><g className="cursor-pointer"><rect fill={node.referrerId ? "#111d31" : "#15284a"} height="58" rx="13" stroke={node.active ? "#4d6f9d" : "#56606f"} width="188" x={node.x} y={node.y}/>{node.avatarId ? <image clipPath={`url(#avatar-${node.id})`} height="30" href={`/api/media/${node.avatarId}/avatar_small`} preserveAspectRatio="xMidYMid slice" width="30" x={node.x + 10} y={node.y + 14}/> : <><circle cx={node.x + 25} cy={node.y + 29} fill="#214b7b" r="15"/><text fill="#dbeafe" fontSize="11" fontWeight="700" textAnchor="middle" x={node.x + 25} y={node.y + 33}>{node.name.slice(0, 1).toLocaleUpperCase()}</text></>}<text direction="auto" fill="#f8fafc" fontSize="12" fontWeight="600" x={node.x + 49} y={node.y + 25}>{shortName(node.name)}</text><text fill="#a7b4c7" fontSize="10" x={node.x + 49} y={node.y + 42}>{node.referrerId ? "Referred customer" : "Referral source"}</text><title>{node.name}</title></g></a>)}
        </svg></div>
      </> : <div className="empty border-t border-white/10">No customers match this filter.</div>}
    </section>
  </div>;
}

function Avatar({ node }: { node: ReferralNode }) {
  return <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-500/15 font-bold text-blue-200">{node.avatarId ? <img alt="" className="size-full object-cover" src={`/api/media/${node.avatarId}/avatar_small`}/> : node.name.slice(0, 1).toLocaleUpperCase()}</span>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof UsersRound; label: string; value: number; tone: string }) {
  return <article className="stat flex min-h-16 items-center gap-2.5 p-2.5 sm:min-h-20 sm:p-3"><span className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.04] ${tone}`}><Icon size={16}/></span><span className="min-w-0"><span className="block truncate text-sm text-slate-400">{label}</span><strong className="mt-0.5 block text-lg leading-none">{value}</strong></span></article>;
}
