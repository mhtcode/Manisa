"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Search, UserRound, X } from "lucide-react";

type CustomerRecord = {
  appointmentCount: number;
  email: string | null;
  id: string;
  language: "en" | "fa";
  name: string;
  phone: string | null;
};

export function CustomerDirectory({ customers, initialQuery = "" }: { customers: CustomerRecord[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) => [customer.name, customer.phone, customer.email].some((value) => value?.toLocaleLowerCase().includes(needle)));
  }, [customers, deferredQuery]);

  return <>
    <div className="panel mb-4 flex items-center gap-3 p-3 focus-within:border-teal-300/35">
      <Search className="ms-1 shrink-0 text-slate-500" size={18}/>
      <input aria-label="Search customers" autoComplete="off" className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600" dir="auto" onChange={(event) => setQuery(event.target.value)} placeholder="Type a name, phone, or email…" value={query}/>
      {query && <button aria-label="Clear search" className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white/[0.06] hover:text-white" onClick={() => setQuery("")} type="button"><X size={16}/></button>}
      <span className="hidden rounded-lg bg-white/[0.045] px-2.5 py-1.5 text-xs text-slate-500 sm:block">{filtered.length} {filtered.length === 1 ? "result" : "results"}</span>
    </div>
    <section className="panel overflow-hidden">{filtered.length ? <div className="divide-y divide-white/8">{filtered.map((customer) => <Link href={`/customers/${customer.id}`} key={customer.id} className="grid gap-3 px-4 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center sm:px-6"><div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-300/8 text-teal-300"><UserRound size={16}/></span><span className="min-w-0"><span className="block truncate font-medium" dir="auto">{customer.name}</span><span className="mt-1 block text-xs text-slate-500">{customer.language === "fa" ? "فارسی" : "English"}</span></span></div><p className="text-sm text-slate-400">{customer.phone || "No phone"}</p><p className="truncate text-sm text-slate-500">{customer.email || "No email"}</p><span className="text-xs text-slate-600">{customer.appointmentCount} appointments</span></Link>)}</div> : <div className="empty"><Search className="mb-3 text-slate-700" size={26}/><p>No customers match “<span dir="auto">{query}</span>”.</p><button className="mt-4 text-sm text-teal-300" onClick={() => setQuery("")} type="button">Clear search</button></div>}</section>
  </>;
}
