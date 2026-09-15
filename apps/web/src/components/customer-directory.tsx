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
      <Search className="ms-1 shrink-0 text-slate-500" size={19}/>
      <input aria-label="Search customers" autoComplete="off" className="h-9 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-500" dir="auto" onChange={(event) => setQuery(event.target.value)} placeholder="Type a name, phone, or email…" value={query}/>
      {query && <button aria-label="Clear search" className="icon-button size-8" onClick={() => setQuery("")} title="Clear search" type="button"><X size={16}/></button>}
      <span className="hidden rounded-lg bg-white/[0.045] px-2.5 py-1.5 text-sm text-slate-400 sm:block">{filtered.length} {filtered.length === 1 ? "result" : "results"}</span>
    </div>
    <BulkSelection action={bulkMoveToTrash.bind(null, "customer")} allIds={filtered.map((item) => item.id)}>
      <section className="panel overflow-hidden">
        {filtered.length ? <div className={mode === "grid" ? "grid gap-2.5 p-2.5 sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-white/8"}>
          {filtered.map((customer) => <CustomerLink customer={customer} key={customer.id} mode={mode}/>)}
        </div> : <div className="empty"><Search className="mb-3 text-slate-500" size={26}/><p>No customers match “<span dir="auto">{query}</span>”.</p><button className="button-secondary mt-4" onClick={() => setQuery("")} type="button">Clear search</button></div>}
      </section>
    </BulkSelection>
  </>;
}

function CustomerLink({ customer, mode }: { customer: CustomerRecord; mode: "grid" | "list" }) {
  const latestVisit = customer.latestVisit ? new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(customer.latestVisit)) : "No visits";
  return <SelectableLink className={mode === "grid" ? "grid gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 transition hover:border-blue-400/25 hover:bg-blue-500/[0.05]" : "grid gap-3 px-4 py-3 transition hover:bg-blue-500/[0.04] sm:px-5 lg:grid-cols-[1.25fr_1fr_.8fr_.9fr_auto] lg:items-center"} href={`/customers/${customer.id}`} id={customer.id}>
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-500/10 text-blue-200">{customer.avatarId ? <img alt="" className="size-full object-cover" src={`/api/media/${customer.avatarId}/avatar_small`}/> : <UserRound size={18}/>}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-base font-semibold" dir="auto">{customer.name}</span><span className="mt-0.5 block text-sm text-slate-400">{customer.language === "fa" ? "فارسی" : "English"}</span></span>
      {mode === "grid" && <span className="badge shrink-0 text-slate-300">{customer.appointmentCount}</span>}
    </div>
    <div className="min-w-0 text-sm"><p className="truncate text-slate-300">{customer.phone || "No phone"}</p><p className="mt-0.5 truncate text-slate-500">{customer.email || "No email"}</p></div>
    <CompactDetail icon={CalendarClock} label="Last visit" value={latestVisit}/>
    <CompactDetail icon={Sparkles} label="Top service" value={customer.popularService || "Not enough history"}/>
    {mode === "list" && <span className="text-sm text-slate-400">{customer.appointmentCount} total</span>}
  </SelectableLink>;
}

function CompactDetail({ icon: Icon, label, value }: { icon: typeof CalendarClock; label: string; value: string }) {
  return <div className="flex min-w-0 items-center gap-2"><Icon className="shrink-0 text-blue-300/80" size={15}/><span className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><span className="mt-0.5 block truncate text-sm text-slate-300" dir="auto">{value}</span></span></div>;
}
