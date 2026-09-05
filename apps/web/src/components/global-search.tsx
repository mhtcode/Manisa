"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, CircleDollarSign, Layers3, LoaderCircle, Search, Settings2, Sparkles, UserRound, X } from "lucide-react";
import type { BusinessPermission } from "@/lib/permissions";

type Result = { id: string; type: string; title: string; subtitle: string; href: string };
const settings = [
  ["Settings", "Business preferences", "/settings", "business.manage"], ["Financial", "Payments and collections", "/settings/financial", "financial.view"],
  ["Members", "Roles and permissions", "/settings/members", "members.manage"], ["Categories", "Service organization", "/settings/categories", "services.manage"],
  ["Calendar import", "Batch and calendar imports", "/settings/calendar-import", "appointments.manage"], ["Google Calendar", "One-way appointment synchronization", "/settings/google-calendar", "integrations.manage"], ["Trash", "Deleted items", "/settings/trash", "trash.manage"],
] as const;

function ResultIcon({ type }: { type: string }) {
  const Icon = type === "Customer" ? UserRound : type === "Appointment" ? CalendarClock : type === "Service" || type === "Category" ? Sparkles : type === "Payment method" ? CircleDollarSign : type === "Setting" ? Settings2 : Layers3;
  return <Icon size={17}/>;
}

export function GlobalSearch({ permissions }: { permissions: BusinessPermission[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setLoading(false);
  }, []);
  const localResults = useMemo<Result[]>(() => query.trim().length < 2 ? [] : settings.filter(([title, subtitle, , permission]) => permissions.includes(permission) && `${title} ${subtitle}`.toLowerCase().includes(query.trim().toLowerCase())).map(([title, subtitle, href]) => ({ id: href, type: "Setting", title, subtitle, href })), [permissions, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); }
      if (event.key === "Escape") closeSearch();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSearch]);
  useEffect(() => { if (open) window.setTimeout(() => inputRef.current?.focus(), 0); }, [open]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);
  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try { const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`, { signal: controller.signal }); const data = await response.json() as { results?: Result[] }; setResults(response.ok ? data.results || [] : []); }
      catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);
  const allResults = [...localResults, ...results];
  return <>
    <button aria-label="Search everything" className="icon-button" onClick={() => setOpen(true)} ref={triggerRef} title="Search · Ctrl K" type="button"><Search size={17}/></button>
    {open && createPortal(<div className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-[#02050a]/55 px-3 pt-[max(4rem,8vh)] backdrop-blur-xl" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSearch(); }}>
      <section aria-label="Search Manisa" aria-modal="true" className="min-w-0 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-[#0b121d]/98 shadow-[0_35px_120px_rgba(0,0,0,.8)]" role="dialog">
        <div className="min-w-0 p-3"><div className="field flex h-14 min-w-0 items-center gap-3 py-0"><Search className="shrink-0 text-blue-300" size={19}/><input aria-label="Search customers, appointments, services, and settings" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-600" onChange={(event) => { const value = event.target.value; setQuery(value); setResults([]); setLoading(value.trim().length >= 2); }} placeholder="Search Manisa…" ref={inputRef} value={query}/>{loading && <LoaderCircle className="shrink-0 animate-spin text-slate-500" size={17}/>}<button aria-label="Close search" className="flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-white/[0.05] hover:text-white" onClick={closeSearch} type="button"><X size={18}/></button></div></div>
        <div className="max-h-[min(65vh,38rem)] overflow-y-auto p-2">{query.trim().length < 2 ? <p className="px-4 py-10 text-center text-sm text-slate-500">Type at least 2 characters to search this workspace.</p> : allResults.length ? allResults.map((result) => <Link className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-blue-500/10" href={result.href} key={`${result.type}:${result.id}`} onClick={closeSearch}><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><ResultIcon type={result.type}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold" dir="auto">{result.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500" dir="auto">{result.type} · {result.subtitle}</span></span></Link>) : !loading && <p className="px-4 py-10 text-center text-sm text-slate-500">No matching items.</p>}</div>
      </section>
    </div>, document.body)}
  </>;
}
