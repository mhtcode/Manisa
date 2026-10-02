"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCheck, CheckSquare2, RotateCcw, Square, SquareCheckBig, Trash2 } from "lucide-react";

const SelectionContext = createContext<{ active: boolean; controls: React.ReactNode; selected: Set<string>; toggle(id: string): void } | null>(null);
const controlClass = "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35";

function SelectionAction({ action, ids, label, confirmMessage, danger = false, onComplete, children }: { action: (data: FormData) => void | Promise<void>; ids: Set<string>; label: string; confirmMessage: string; danger?: boolean; onComplete(): void; children: React.ReactNode }) {
  const [completed, setCompleted] = useState(0);
  useEffect(() => { if (completed) onComplete(); }, [completed, onComplete]);
  return <form action={async (data) => { await action(data); setCompleted((value) => value + 1); }} className="contents">
    <input name="ids" type="hidden" value={JSON.stringify([...ids])}/>
    <button aria-label={label} className={`${controlClass} ${danger ? "text-rose-300 hover:bg-rose-400/10 hover:text-rose-200" : ""}`} disabled={!ids.size} onClick={(event) => { if (!window.confirm(confirmMessage)) event.preventDefault(); }} title={label}>{children}</button>
  </form>;
}

export function BulkSelection({ action, secondaryAction, allIds, children, locale = "en", primary = "trash", embedded = false, integrated = false }: { action: (data: FormData) => void | Promise<void>; secondaryAction?: (data: FormData) => void | Promise<void>; allIds: string[]; children: React.ReactNode; locale?: "en" | "fa"; primary?: "trash" | "restore"; embedded?: boolean; integrated?: boolean }) {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState(new Set<string>());
  const t = locale === "fa" ? { select: "انتخاب", all: "انتخاب همه", clear: "پاک کردن", trash: "انتقال به زباله‌دان", restore: "بازیابی", permanent: "حذف دائمی", confirm: "موارد انتخاب‌شده به زباله‌دان منتقل شوند؟", confirmRestore: "موارد انتخاب‌شده بازیابی شوند؟", confirmPermanent: "برای همیشه حذف شوند؟ این کار قابل بازگشت نیست." } : { select: "Select", all: "Select all", clear: "Clear selection", trash: "Move to Trash", restore: "Restore", permanent: "Delete permanently", confirm: "Move selected items to Trash?", confirmRestore: "Restore selected items?", confirmPermanent: "Permanently delete selected items? This cannot be undone." };
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const close = useCallback(() => { setActive(false); setSelected(new Set()); }, []);
  const allSelected = allIds.length > 0 && selected.size === allIds.length;

  const controls = <div className={`${embedded || integrated ? "flex" : "mb-3 flex"} min-h-9 items-center justify-start gap-1`} dir="ltr">
      <button aria-label={active ? t.clear : t.select} aria-pressed={active} className={`${controlClass} ${active ? "text-blue-300" : ""}`} onClick={active ? close : () => setActive(true)} title={active ? t.clear : t.select} type="button"><CheckSquare2 size={19}/></button>
      <span aria-live="polite" className="w-14 shrink-0 text-center text-sm font-semibold tabular-nums text-slate-400">{selected.size}/{allIds.length}</span>
      {active && <><span className="mx-1 h-5 w-px bg-white/10"/>
      <button aria-label={t.all} aria-pressed={allSelected} className={controlClass} onClick={() => setSelected(allSelected ? new Set() : new Set(allIds))} title={t.all} type="button"><CheckCheck size={18}/></button>
      <SelectionAction action={action} confirmMessage={`${primary === "restore" ? t.confirmRestore : t.confirm} (${selected.size})`} ids={selected} label={primary === "restore" ? t.restore : t.trash} onComplete={close}>{primary === "restore" ? <RotateCcw size={16}/> : <Trash2 size={16}/>}</SelectionAction>
      {secondaryAction && <SelectionAction action={secondaryAction} confirmMessage={`${t.confirmPermanent} (${selected.size})`} danger ids={selected} label={t.permanent} onComplete={close}><Trash2 size={16}/></SelectionAction>}
      </>}
  </div>;

  return <SelectionContext.Provider value={{ active, controls, selected, toggle }}>
    {!integrated && <div className={embedded ? "border-b border-white/8 px-4 py-2" : ""}>{controls}</div>}
    {children}
  </SelectionContext.Provider>;
}

export function BulkSelectionControls() {
  return useContext(SelectionContext)?.controls ?? null;
}

function SelectionCheckbox({ checked, onClick, centered, positioned = true }: { checked: boolean; onClick(): void; centered: boolean; positioned?: boolean }) {
  const Icon = checked ? SquareCheckBig : Square;
  return <button aria-label="Toggle selection" aria-pressed={checked} className={`${positioned ? `absolute left-2 z-20 ${centered ? "top-1/2 -translate-y-1/2" : "top-2"}` : centered ? "self-center" : "mt-2"} flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.07] hover:text-white ${checked ? "text-blue-300" : ""}`} onClick={onClick} type="button"><Icon size={20}/></button>;
}

export function SelectableLink({ id, href, className, children, reserveSelectionSpace = true }: { id: string; href: string; className: string; children: React.ReactNode; reserveSelectionSpace?: boolean }) {
  const context = useContext(SelectionContext);
  if (!context?.active) return <Link className={className} href={href}>{children}</Link>;
  const checked = context.selected.has(id);
  if (!reserveSelectionSpace) return <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start"><SelectionCheckbox centered={false} checked={checked} onClick={() => context.toggle(id)} positioned={false}/><div className={className}>{children}</div></div>;
  return <div className="relative min-w-0"><SelectionCheckbox centered checked={checked} onClick={() => context.toggle(id)}/><div className={`${className} !pl-12`}>{children}</div></div>;
}

export function SelectableItem({ id, className = "", children, reserveSelectionSpace = false }: { id: string; className?: string; children: React.ReactNode; reserveSelectionSpace?: boolean }) {
  const context = useContext(SelectionContext);
  const checked = context?.selected.has(id) || false;
  if (!context?.active) return <div className={className}>{children}</div>;
  if (!reserveSelectionSpace) return <div className={`${className} grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start`}><SelectionCheckbox centered={false} checked={checked} onClick={() => context.toggle(id)} positioned={false}/><div className="min-w-0">{children}</div></div>;
  return <div className={`${className} relative pl-11`}><SelectionCheckbox centered checked={checked} onClick={() => context.toggle(id)}/>{children}</div>;
}
