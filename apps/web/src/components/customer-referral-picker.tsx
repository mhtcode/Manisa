"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, UserRound, X } from "lucide-react";

export type ReferralOption = { id: string; name: string; phone: string | null; email: string | null };

export function CustomerReferralPicker({ customers, initialId }: { customers: ReferralOption[]; initialId?: string | null }) {
  const initial = customers.find((customer) => customer.id === initialId);
  const [selectedId, setSelectedId] = useState(initial?.id || "");
  const [query, setQuery] = useState(initial?.name || "");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return customers.slice(0, 8);
    return customers.filter((customer) => [customer.name, customer.phone, customer.email].some((value) => value?.toLocaleLowerCase().includes(needle))).slice(0, 8);
  }, [customers, query]);

  useEffect(() => {
    function close(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, []);

  return <div className="relative" ref={root}>
    <div className={`flex min-h-11 items-center gap-2 rounded-xl border bg-[#0a0e14] px-3.5 transition ${open ? "border-white/20 bg-[#0b1017] shadow-[0_0_0_3px_rgba(148,163,184,.05)]" : "border-white/10"}`}>
      <Search className="shrink-0 text-slate-500" size={16}/><input aria-autocomplete="list" aria-controls="customer-referral-results" aria-expanded={open} autoComplete="off" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-600" dir="auto" id="referrer-search" onChange={(event) => { setQuery(event.target.value); setSelectedId(""); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search by name, phone, or email…" role="combobox" value={query}/>{selectedId ? <button aria-label="Remove referral" className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-white" onClick={() => { setSelectedId(""); setQuery(""); setOpen(false); }} type="button"><X size={15}/></button> : null}
    </div>
    {open && <div className="absolute inset-x-0 top-[calc(100%+.45rem)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#101720] p-1.5 shadow-[0_22px_60px_rgba(0,0,0,.55)]" id="customer-referral-results" role="listbox">
      <button aria-selected={!selectedId} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm text-slate-400 hover:bg-white/[0.05]" onClick={() => { setSelectedId(""); setQuery(""); setOpen(false); }} role="option" type="button"><span className="flex size-8 items-center justify-center rounded-full bg-white/[0.05]"><X size={14}/></span>No referring customer</button>
      {filtered.map((customer) => <button aria-selected={customer.id === selectedId} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-white/[0.055]" key={customer.id} onClick={() => { setSelectedId(customer.id); setQuery(customer.name); setOpen(false); }} role="option" type="button"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-300"><UserRound size={15}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white" dir="auto">{customer.name}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{customer.phone || customer.email || "No contact details"}</span></span>{customer.id === selectedId && <Check className="shrink-0 text-blue-300" size={16}/>}</button>)}
      {!filtered.length && <p className="px-3 py-4 text-center text-sm text-slate-500">No matching customers.</p>}
    </div>}
    <input name="referrerId" type="hidden" value={selectedId}/>
  </div>;
}
