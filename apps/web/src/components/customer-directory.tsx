"use client";
/* eslint-disable @next/next/no-img-element -- customer avatars use an authorized media endpoint */

import { useDeferredValue, useMemo, useState } from "react";
import { CalendarClock, Search, Sparkles, UserRound, X } from "lucide-react";
import { BulkSelection, SelectableLink } from "@/components/bulk-selection";
import { bulkMoveToTrash } from "@/server/actions/trash";

type CustomerRecord = {
  avatarId: string | null;
  appointmentCount: number;
  email: string | null;
  id: string;
  language: "en" | "fa";
  latestVisit: string | null;
  name: string;
  phone: string | null;
  popularService: string | null;
};

export function CustomerDirectory({ customers, initialQuery = "", mode = "list" }: { customers: CustomerRecord[]; initialQuery?: string; mode?: "grid" | "list" }) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) => [customer.name, customer.phone, customer.email, customer.popularService].some((value) => value?.toLocaleLowerCase().includes(needle)));
  }, [customers, deferredQuery]);

  return <>
    <div className="panel mb-4 flex items-center gap-3 p-3 transition focus-within:border-white/20 focus-within:bg-[#0f151d] focus-within:shadow-[0_0_0_3px_rgba(148,163,184,.05)]">
      <Search className="ms-1 shrink-0 text-slate-500" size={18}/>
      <input aria-label="Search customers" autoComplete="off" className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600" dir="auto" onChange={(event) => setQuery(event.target.value)} placeholder="Type a name, phone, or email…" value={query}/>
      {query && <button aria-label="Clear search" className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white/[0.06] hover:text-white" onClick={() => setQuery("")} type="button"><X size={16}/></button>}
      <span className="hidden rounded-lg bg-white/[0.045] px-2.5 py-1.5 text-xs text-slate-500 sm:block">{filtered.length} {filtered.length === 1 ? "result" : "results"}</span>
    </div>
    <BulkSelection action={bulkMoveToTrash.bind(null, "customer")} allIds={filtered.map((item) => item.id)}><section className="panel overflow-hidden">{filtered.length ? <div className={mode === "grid" ? "grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-white/8"}>{filtered.map((customer) => <SelectableLink href={`/customers/${customer.id}`} id={customer.id} key={customer.id} className={mode === "grid" ? "grid gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-blue-400/20 hover:bg-blue-500/[0.04]" : "grid gap-3 px-4 py-4 transition hover:bg-white/[0.025] sm:px-6 lg:grid-cols-[1.2fr_.85fr_.8fr_.8fr_auto] lg:items-center"}><div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-500/8 text-blue-300">{customer.avatarId ? <img alt="" className="size-full object-cover" src={`/api/media/${customer.avatarId}/avatar_small`}/> : <UserRound size={16}/>}</span><span className="min-w-0"><span className="block truncate font-medium" dir="auto">{customer.name}</span><span className="mt-1 block text-xs text-slate-500">{customer.language === "fa" ? "فارسی" : "English"}</span></span></div><div className="text-sm"><p className="text-slate-400">{customer.phone || "No phone"}</p><p className="mt-1 truncate text-xs text-slate-600">{customer.email || "No email"}</p></div><div className="flex items-start gap-2"><CalendarClock className="mt-0.5 shrink-0 text-slate-600" size={14}/><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Last visit</p><p className="mt-1 text-xs text-slate-400">{customer.latestVisit ? new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(customer.latestVisit)) : "No visits"}</p></div></div><div className="flex min-w-0 items-start gap-2"><Sparkles className="mt-0.5 shrink-0 text-violet-300/60" size={14}/><div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-slate-600">Top service</p><p className="mt-1 truncate text-xs text-slate-400" dir="auto">{customer.popularService || "Not enough history"}</p></div></div><span className="text-xs text-slate-600">{customer.appointmentCount} total</span></SelectableLink>)}</div> : <div className="empty"><Search className="mb-3 text-slate-700" size={26}/><p>No customers match “<span dir="auto">{query}</span>”.</p><button className="mt-4 text-sm text-blue-300" onClick={() => setQuery("")} type="button">Clear search</button></div>}</section></BulkSelection>
  </>;
}
