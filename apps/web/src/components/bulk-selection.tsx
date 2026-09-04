"use client";

import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { CheckSquare2, RotateCcw, Trash2, X } from "lucide-react";

const SelectionContext = createContext<{ active: boolean; selected: Set<string>; toggle(id: string): void } | null>(null);

export function BulkSelection({ action, secondaryAction, allIds, children, locale = "en", primary = "trash" }: { action: (data: FormData) => void | Promise<void>; secondaryAction?: (data: FormData) => void | Promise<void>; allIds: string[]; children: React.ReactNode; locale?: "en" | "fa"; primary?: "trash" | "restore" }) {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState(new Set<string>());
  const t = locale === "fa" ? { select: "انتخاب", all: "انتخاب همه", clear: "پاک کردن", trash: "انتقال به زباله‌دان", confirm: "موارد انتخاب‌شده به زباله‌دان منتقل شوند؟" } : { select: "Select", all: "Select all", clear: "Clear", trash: "Move to Trash", confirm: "Move all selected items to Trash?" };
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <SelectionContext.Provider value={{ active, selected, toggle }}><div className="mb-3 flex justify-end"><button aria-pressed={active} className="icon-button" onClick={() => { setActive((value) => !value); setSelected(new Set()); }} title={t.select} type="button">{active ? <X size={16}/> : <CheckSquare2 size={16}/>}<span className="sr-only">{t.select}</span></button></div>{children}{active && <form action={action} className="sticky bottom-24 z-30 mt-4 flex items-center gap-2 rounded-2xl border border-blue-300/25 bg-[#0b1423]/95 p-2.5 shadow-2xl backdrop-blur-xl"><input name="ids" type="hidden" value={JSON.stringify([...selected])}/><span className="min-w-8 text-center text-sm font-bold text-blue-200">{selected.size}</span><button className="button-secondary min-h-9 flex-1 px-2" onClick={() => setSelected(new Set(allIds))} type="button">{t.all}</button><button className="icon-button size-9" onClick={() => setSelected(new Set())} title={t.clear} type="button"><X size={15}/></button><button aria-label={primary === "restore" ? "Restore" : t.trash} className="icon-button size-9" disabled={!selected.size} onClick={(event) => { if (!window.confirm(`${primary === "restore" ? "Restore selected items?" : t.confirm} (${selected.size})`)) event.preventDefault(); }} title={primary === "restore" ? "Restore" : t.trash}>{primary === "restore" ? <RotateCcw size={15}/> : <Trash2 size={15}/>}</button>{secondaryAction && <button aria-label="Delete permanently" className="icon-button size-9 border-rose-400/25 text-rose-300" disabled={!selected.size} formAction={secondaryAction} onClick={(event) => { if (!window.confirm(`Permanently delete ${selected.size} selected items? This cannot be undone.`)) event.preventDefault(); }} title="Delete permanently"><Trash2 size={15}/></button>}</form>}</SelectionContext.Provider>;
}

export function SelectableLink({ id, href, className, children }: { id: string; href: string; className: string; children: React.ReactNode }) {
  const context = useContext(SelectionContext);
  if (!context?.active) return <Link className={className} href={href}>{children}</Link>;
  const checked = context.selected.has(id);
  return <button aria-pressed={checked} className={`${className} relative text-start ${checked ? "ring-2 ring-blue-400" : ""}`} onClick={() => context.toggle(id)} type="button"><span className={`absolute end-2 top-2 z-10 flex size-6 items-center justify-center rounded-lg border ${checked ? "border-blue-300 bg-blue-500 text-white" : "border-white/20 bg-black/60"}`}>{checked ? "✓" : ""}</span>{children}</button>;
}

export function SelectableItem({ id, className = "", children }: { id: string; className?: string; children: React.ReactNode }) {
  const context = useContext(SelectionContext);
  const checked = context?.selected.has(id) || false;
  return <div className={`${className} relative ${checked ? "rounded-2xl ring-2 ring-blue-400" : ""}`}>{context?.active && <button aria-label="Toggle selection" aria-pressed={checked} className={`absolute end-2 top-2 z-20 flex size-7 items-center justify-center rounded-lg border ${checked ? "border-blue-300 bg-blue-500 text-white" : "border-white/20 bg-black/70"}`} onClick={() => context.toggle(id)} type="button">{checked ? "✓" : ""}</button>}{children}</div>;
}
