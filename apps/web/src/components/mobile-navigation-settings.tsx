"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Save } from "lucide-react";
import { mobileNavigationKeys, mobileNavigationLabels, type MobileNavigationKey } from "@/lib/mobile-navigation";
import { updateMobileNavigation } from "@/server/actions/settings";

const selectableItems = mobileNavigationKeys;

export function MobileNavigationSettings({ initialOrder }: { initialOrder: MobileNavigationKey[] }) {
  const [items, setItems] = useState(initialOrder);

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  function replace(index: number, value: MobileNavigationKey) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  return <form action={updateMobileNavigation} className="panel overflow-hidden">
    <div className="panel-header"><div><h2 className="font-semibold text-white">Mobile navigation</h2><p className="mt-1 text-xs text-slate-400">Choose and reorder four direct destinations. Management tools remain available from Settings.</p></div><span className="badge border-blue-400/20 bg-blue-500/8 text-blue-200">4 slots</span></div>
    <div className="space-y-2 p-4 sm:p-5">
      {items.map((item, index) => <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-white/9 bg-white/[0.025] p-2 sm:gap-2" key={`${item}-${index}`}>
        <GripVertical className="hidden shrink-0 text-slate-600 sm:block" size={17}/>
        <span className="hidden w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:block">Slot {index + 1}</span>
        <select aria-label={`Mobile navigation slot ${index + 1}`} className="field min-w-0 flex-1" onChange={(event) => replace(index, event.target.value as MobileNavigationKey)} value={item}>
          {selectableItems.map((option) => <option disabled={items.includes(option) && option !== item} key={option} value={option}>{mobileNavigationLabels[option]}</option>)}
        </select>
        <button aria-label={`Move ${mobileNavigationLabels[item]} up`} className="button-secondary size-9 min-h-9 shrink-0 p-0 sm:size-10 sm:min-h-10" disabled={index === 0} onClick={() => move(index, -1)} type="button"><ArrowUp size={15}/></button>
        <button aria-label={`Move ${mobileNavigationLabels[item]} down`} className="button-secondary size-9 min-h-9 shrink-0 p-0 sm:size-10 sm:min-h-10" disabled={index === items.length - 1} onClick={() => move(index, 1)} type="button"><ArrowDown size={15}/></button>
        <input name="mobileNavItems" type="hidden" value={item}/>
      </div>)}
      <div className="flex justify-end pt-2"><button className="button"><Save size={16}/>Save mobile navigation</button></div>
    </div>
  </form>;
}
