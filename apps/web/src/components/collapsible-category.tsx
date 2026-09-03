"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { updateCollapsedSection } from "@/server/actions/settings";

export function CollapsibleCategory({ sectionId, name, description, icon, accentColor, count, initialCollapsed, children }: { sectionId: string; name: string; description: string; icon: string; accentColor: string; count: number; initialCollapsed: boolean; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [, startTransition] = useTransition();
  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    startTransition(() => updateCollapsedSection(sectionId, next));
  }
  return <section className="panel overflow-hidden"><button aria-expanded={!collapsed} className="category-collapse-header" onClick={toggle} type="button"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}><CategoryIcon name={icon} size={19}/></span><span className="min-w-0 flex-1 text-start"><span className="block truncate font-semibold text-white">{name}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span></span><span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-500">{count}</span><ChevronDown className={`shrink-0 text-slate-500 transition ${collapsed ? "-rotate-90 rtl:rotate-90" : ""}`} size={18}/></button>{!collapsed && <div className="border-t border-white/8 p-3 sm:p-4">{children}</div>}</section>;
}
